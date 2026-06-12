"""
Custom exception handler for DRF.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides structured error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Add custom error structure
        custom_response_data = {
            "success": False,
            "error": {
                "code": response.status_code,
                "message": get_error_message(response),
                "details": (
                    response.data
                    if isinstance(response.data, dict)
                    else {"detail": response.data}
                ),
            },
        }
        response.data = custom_response_data
    else:
        # Handle unexpected exceptions
        logger.exception(f"Unhandled exception: {exc}")
        response = Response(
            {
                "success": False,
                "error": {
                    "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "message": "Error interno del servidor",
                    "details": {},
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def get_error_message(response):
    """Get a human-readable error message based on status code."""
    messages = {
        400: "Solicitud incorrecta",
        401: "No autorizado",
        403: "Acceso denegado",
        404: "Recurso no encontrado",
        405: "Método no permitido",
        429: "Demasiadas solicitudes",
        500: "Error interno del servidor",
    }
    return messages.get(response.status_code, "Error desconocido")
