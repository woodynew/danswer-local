import time
from collections.abc import Callable
from collections.abc import Generator
from collections.abc import Iterator
from functools import wraps
from typing import Any
from typing import cast
from typing import TypeVar

from danswer.utils.logger import setup_logger

logger = setup_logger()

F = TypeVar("F", bound=Callable)
FG = TypeVar("FG", bound=Callable[..., Generator | Iterator])


def simple_log_function_time(
    func_name: str | None = None,
    debug_only: bool = False,
    include_args: bool = False,
) -> Callable[[F], F]:
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapped_func(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed_time_str = str(time.time() - start_time)
            log_name = func_name or func.__name__
            args_str = f" args={args} kwargs={kwargs}" if include_args else ""
            final_log = f"{log_name}{args_str} took {elapsed_time_str} seconds"
            if debug_only:
                logger.debug(final_log)
            else:
                logger.info(final_log)

            return result

        return cast(F, wrapped_func)

    return decorator
