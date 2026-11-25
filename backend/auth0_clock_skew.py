"""Auth0 JWT verification with bounded UTC clock-skew tolerance."""

import logging
from typing import Optional
from unittest.mock import patch

import jwt
import auth0_fastapi.auth.auth_client as auth_client_module
from auth0_fastapi.auth.auth_client import AuthClient
from auth0_server_python.auth_server.server_client import ServerClient
from auth0_server_python.error import ApiError


AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS = 30
_LOGGER = logging.getLogger(__name__)


class ClockSkewTolerantServerClient(ServerClient):
    """Keep the SDK's JWT checks while allowing 30 seconds of clock skew."""

    async def _verify_and_decode_jwt(
        self, token: str, jwks: dict, audience: Optional[str] = None
    ) -> dict:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        signing_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                signing_key = jwt.PyJWK.from_dict(key)
                break

        if signing_key is None:
            raise ValueError(f"No matching key found in JWKS for kid: {kid}")

        # Keep signature verification enabled. Issuer is checked by the SDK's
        # normalized issuer comparison immediately after this method returns.
        decode_options = {"verify_signature": True, "verify_iss": False}
        kwargs = {
            "algorithms": ["RS256"],
            "options": decode_options,
            "leeway": AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS,
        }
        if audience:
            kwargs["audience"] = audience

        try:
            return jwt.decode(token, signing_key.key, **kwargs)
        except jwt.ImmatureSignatureError as exc:
            if "(iat)" in str(exc):
                _LOGGER.warning(
                    "Rejected Auth0 token: iat exceeds the %d-second clock-skew "
                    "allowance; check server UTC/NTP synchronization.",
                    AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS,
                )
                raise ApiError(
                    "invalid_token",
                    "Auth0 sign-in was rejected because the ID token issue time "
                    "is more than 30 seconds ahead of server time. Check server "
                    "UTC/NTP synchronization and try again.",
                ) from exc
            _LOGGER.warning(
                "Rejected Auth0 token: nbf exceeds the %d-second clock-skew allowance.",
                AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS,
            )
            raise
        except jwt.ExpiredSignatureError:
            _LOGGER.warning(
                "Rejected expired Auth0 token beyond the %d-second clock-skew allowance.",
                AUTH0_JWT_CLOCK_SKEW_LEEWAY_SECONDS,
            )
            raise
        except jwt.InvalidSignatureError:
            _LOGGER.warning("Rejected Auth0 token due to signature verification failure.")
            raise


def create_auth_client(config) -> AuthClient:
    """Construct the standard Auth0 client with the bounded verifier subclass."""
    # Auth0 FastAPI currently constructs ServerClient internally. Substitute
    # only during construction so its state, transaction, nonce, and callback
    # handling remain the SDK's unchanged implementation.
    with patch.object(
        auth_client_module, "ServerClient", ClockSkewTolerantServerClient
    ):
        return AuthClient(config)
