import contextvars
from django.utils.deprecation import MiddlewareMixin

# ContextVar to store the current request object in a
# thread/async-task-safe manner
_current_request = contextvars.ContextVar("current_request", default=None)


class ActivityLogMiddleware(MiddlewareMixin):
    """
    Middleware to store the current HTTP request in context storage,
    making it accessible to signal handlers for auditing.
    """

    def process_request(self, request):
        _current_request.set(request)

    def process_response(self, request, response):
        # Reset is handled automatically by contextvars scope, but returning
        # response is required
        return response


def get_current_request():
    """Retrieve the current request from context storage."""
    try:
        return _current_request.get()
    except LookupError:
        return None
