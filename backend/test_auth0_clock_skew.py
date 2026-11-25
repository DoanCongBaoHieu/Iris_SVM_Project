import json
import time
import unittest

import jwt
from auth0_fastapi.config import Auth0Config
from auth0_server_python.error import ApiError
from cryptography.hazmat.primitives.asymmetric import rsa

from backend.auth0_clock_skew import (
    AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS,
    ClockSkewTolerantServerClient,
    create_auth_client,
)


class Auth0JwtClockSkewTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_id = "iris-test-client"
        cls.issuer = "https://iris-test.auth0.com/"
        cls.kid = "clock-skew-test-key"
        cls.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        cls.other_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        public_jwk = json.loads(
            jwt.algorithms.RSAAlgorithm.to_jwk(cls.private_key.public_key())
        )
        public_jwk["kid"] = cls.kid
        cls.jwks = {"keys": [public_jwk]}
        cls.server_client = ClockSkewTolerantServerClient.__new__(
            ClockSkewTolerantServerClient
        )

    def issue_token(
        self,
        *,
        issued_at_offset=0,
        expiration_offset=300,
        audience=None,
        signing_key=None,
    ):
        now = int(time.time())
        payload = {
            "iss": self.issuer,
            "sub": "auth0|clock-skew-test",
            "aud": audience or self.client_id,
            "iat": now + issued_at_offset,
            "exp": now + expiration_offset,
            "nonce": "expected-nonce-remains-sdk-validated",
        }
        return jwt.encode(
            payload,
            signing_key or self.private_key,
            algorithm="RS256",
            headers={"kid": self.kid},
        )

    async def decode(self, token):
        return await self.server_client._verify_and_decode_jwt(
            token,
            self.jwks,
            audience=self.client_id,
        )

    async def test_valid_token_is_accepted(self):
        claims = await self.decode(self.issue_token(issued_at_offset=-2))
        self.assertEqual(claims["sub"], "auth0|clock-skew-test")

    async def test_small_future_iat_within_leeway_is_accepted(self):
        self.assertEqual(AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS, 30)
        claims = await self.decode(
            self.issue_token(issued_at_offset=20, expiration_offset=320)
        )
        self.assertGreater(claims["iat"], int(time.time()))

    async def test_future_iat_beyond_leeway_is_rejected_with_safe_message(self):
        token = self.issue_token(issued_at_offset=31, expiration_offset=331)
        with self.assertRaises(ApiError) as raised:
            await self.decode(token)

        self.assertEqual(raised.exception.code, "invalid_token")
        self.assertIn("UTC/NTP", raised.exception.message)
        self.assertNotIn(token, raised.exception.message)

    async def test_expired_token_beyond_leeway_is_rejected(self):
        token = self.issue_token(issued_at_offset=-300, expiration_offset=-60)
        with self.assertRaises(jwt.ExpiredSignatureError):
            await self.decode(token)

    async def test_expired_token_within_leeway_is_accepted(self):
        token = self.issue_token(issued_at_offset=-300, expiration_offset=-15)
        claims = await self.decode(token)
        self.assertLess(claims["exp"], int(time.time()))

    async def test_invalid_signature_is_rejected(self):
        token = self.issue_token(signing_key=self.other_private_key)
        with self.assertRaises(jwt.InvalidSignatureError):
            await self.decode(token)

    async def test_audience_validation_remains_enabled(self):
        token = self.issue_token(audience="another-client")
        with self.assertRaises(jwt.InvalidAudienceError):
            await self.decode(token)

    def test_auth0_fastapi_uses_the_clock_skew_client(self):
        config = Auth0Config(
            domain="iris-test.auth0.com",
            client_id=self.client_id,
            client_secret="test-client-secret",
            app_base_url="http://localhost:8000",
            secret="test-cookie-secret-that-is-long-enough-123",
        )
        auth_client = create_auth_client(config)
        self.assertIsInstance(auth_client.client, ClockSkewTolerantServerClient)
