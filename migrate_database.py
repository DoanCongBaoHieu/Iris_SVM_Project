import os
import pyodbc
import psycopg


# ======================================================
# 1. SQL SERVER LOCAL
# ======================================================

SQL_SERVER_CONNECTION = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    r"SERVER=.\SQLEXPRESS;"
    "DATABASE=IrisSVM_DB;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)


# ======================================================
# 2. RENDER POSTGRESQL
# ======================================================

TARGET_DATABASE_URL = os.getenv("RENDER_DB_URL")

if not TARGET_DATABASE_URL:
    raise RuntimeError(
        "Chưa có biến môi trường RENDER_DB_URL."
    )


# ======================================================
# 3. KẾT NỐI 2 DATABASE
# ======================================================

print("🔌 Đang kết nối SQL Server local...")

source_conn = pyodbc.connect(
    SQL_SERVER_CONNECTION
)

print("✅ SQL Server local đã kết nối.")


print("🔌 Đang kết nối PostgreSQL Render...")

target_conn = psycopg.connect(
    TARGET_DATABASE_URL,
    sslmode="require"
)

print("✅ PostgreSQL Render đã kết nối.")


# ======================================================
# 4. KIỂM TRA TARGET CÓ DỮ LIỆU CHƯA
# ======================================================

with target_conn.cursor() as cursor:

    cursor.execute(
        "SELECT COUNT(*) FROM users"
    )

    target_users_count = cursor.fetchone()[0]


    cursor.execute(
        "SELECT COUNT(*) FROM prediction_history"
    )

    target_history_count = cursor.fetchone()[0]


if target_users_count > 0 or target_history_count > 0:

    source_conn.close()
    target_conn.close()

    raise RuntimeError(
        "PostgreSQL Render đã có dữ liệu. "
        "Script dừng để tránh tạo bản ghi trùng."
    )


# ======================================================
# 5. ĐỌC USERS TỪ SQL SERVER
# ======================================================

print("📥 Đang đọc bảng users...")

source_cursor = source_conn.cursor()

source_cursor.execute(
    """
    SELECT
        id,
        username,
        password_hash,
        role,
        created_at
    FROM users
    ORDER BY id
    """
)

users = source_cursor.fetchall()

print(
    f"✅ Đọc được {len(users)} tài khoản."
)


# ======================================================
# 6. ĐỌC PREDICTION HISTORY
# ======================================================

print("📥 Đang đọc bảng prediction_history...")

source_cursor.execute(
    """
    SELECT
        id,
        user_id,
        sepal_length,
        sepal_width,
        petal_length,
        petal_width,
        prediction,
        species,
        prediction_time_ms,
        created_at
    FROM prediction_history
    ORDER BY id
    """
)

histories = source_cursor.fetchall()

print(
    f"✅ Đọc được {len(histories)} lịch sử dự đoán."
)


# ======================================================
# 7. GHI USERS SANG POSTGRESQL
# ======================================================

print("📤 Đang chuyển users...")

with target_conn.cursor() as cursor:

    for row in users:

        cursor.execute(
            """
            INSERT INTO users (
                id,
                username,
                password_hash,
                role,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                row.id,
                row.username,
                row.password_hash,
                row.role,
                row.created_at
            )
        )


print(
    f"✅ Đã chuyển {len(users)} tài khoản."
)


# ======================================================
# 8. GHI HISTORY SANG POSTGRESQL
# ======================================================

print("📤 Đang chuyển prediction_history...")

with target_conn.cursor() as cursor:

    for row in histories:

        cursor.execute(
            """
            INSERT INTO prediction_history (
                id,
                user_id,
                sepal_length,
                sepal_width,
                petal_length,
                petal_width,
                prediction,
                species,
                prediction_time_ms,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                row.id,
                row.user_id,
                row.sepal_length,
                row.sepal_width,
                row.petal_length,
                row.petal_width,
                row.prediction,
                row.species,
                row.prediction_time_ms,
                row.created_at
            )
        )


print(
    f"✅ Đã chuyển {len(histories)} lịch sử."
)


# ======================================================
# 9. ĐỒNG BỘ SEQUENCE
# ======================================================

print("🔄 Đồng bộ ID sequence...")

with target_conn.cursor() as cursor:

    cursor.execute(
        """
        SELECT setval(
            pg_get_serial_sequence(
                'users',
                'id'
            ),
            COALESCE(
                (SELECT MAX(id) FROM users),
                1
            ),
            true
        )
        """
    )


    cursor.execute(
        """
        SELECT setval(
            pg_get_serial_sequence(
                'prediction_history',
                'id'
            ),
            COALESCE(
                (SELECT MAX(id) FROM prediction_history),
                1
            ),
            true
        )
        """
    )


# ======================================================
# 10. COMMIT
# ======================================================

target_conn.commit()


# ======================================================
# 11. KIỂM TRA KẾT QUẢ
# ======================================================

with target_conn.cursor() as cursor:

    cursor.execute(
        "SELECT COUNT(*) FROM users"
    )

    final_users_count = cursor.fetchone()[0]


    cursor.execute(
        "SELECT COUNT(*) FROM prediction_history"
    )

    final_history_count = cursor.fetchone()[0]


print()
print("=" * 55)
print("🎉 MIGRATION HOÀN TẤT")
print("=" * 55)

print(
    f"Users:              {final_users_count}"
)

print(
    f"Prediction history: {final_history_count}"
)

print("=" * 55)


# ======================================================
# 12. ĐÓNG CONNECTION
# ======================================================

source_cursor.close()
source_conn.close()
target_conn.close()

print("✅ Đã đóng kết nối.")