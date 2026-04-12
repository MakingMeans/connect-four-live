import secrets

def generate_code() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"
