from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token
)

# 1. Test password hashing
password = "testpassword123"
hashed = hash_password(password)

print("Password hashed:", hashed != password)

# 2. Test password verification
print(
    "Correct password:",
    verify_password(password, hashed)
)

print(
    "Incorrect password:",
    verify_password("wrongpassword", hashed)
)

# 3. Test JWT creation
user_id = 1
token = create_access_token(user_id)

print("JWT generated:", bool(token))

# 4. Test JWT verification
decoded_user_id = verify_access_token(token)

print("Decoded user ID:", decoded_user_id)
