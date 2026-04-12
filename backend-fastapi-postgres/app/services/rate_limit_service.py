from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from app.core.config import LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_SECONDS


class InMemoryRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, current_time: float) -> deque[float]:
        bucket = self._attempts[key]
        while bucket and current_time - bucket[0] > self.window_seconds:
            bucket.popleft()
        return bucket

    def check(self, key: str) -> tuple[bool, int]:
        now = monotonic()
        with self._lock:
            bucket = self._prune(key, now)
            if len(bucket) < self.max_attempts:
                return True, 0

            retry_after = int(self.window_seconds - (now - bucket[0])) + 1
            return False, max(retry_after, 1)

    def register_failure(self, key: str) -> None:
        now = monotonic()
        with self._lock:
            bucket = self._prune(key, now)
            bucket.append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)


login_rate_limiter = InMemoryRateLimiter(
    max_attempts=LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)
