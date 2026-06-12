from typing import Any
"""Budget models - Plantillas presupuestales y claves presupuestarias."""

from django.db import models
from django.conf import settings


class PlantillaPresupuestal(models.Model):
    """
    Plantilla presupuestal que agrupa las claves presupuestarias
    de un ejercicio fiscal para una entidad.
    """
    objects: Any
    DoesNotExist: Any

    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='plantillas_presupuestales',
        verbose_name='Tenant'
    )

    nombre = models.CharField(
        max_length=255,
        verbose_name='Nombre',
        help_text='Ej: "Plantilla 2025"'
    )
    ejercicio_fiscal = models.IntegerField(
        verbose_name='Ejercicio Fiscal',
        help_text='Ej: 2025'
    )
    entidad_federativa = models.CharField(
        max_length=10,
        verbose_name='Entidad Federativa'
    )
    clasificador_administrativo = models.CharField(
        max_length=20,
        verbose_name='Clasificador Administrativo'
    )
    no_municipio_ramo = models.CharField(
        max_length=20,
        verbose_name='No. Municipio / Ramo'
    )
    unidad_administrativa = models.CharField(
        max_length=20,
        verbose_name='Unidad Administrativa'
    )

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='plantillas_creadas',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Plantilla Presupuestal'
        verbose_name_plural = 'Plantillas Presupuestales'
        ordering = ['-ejercicio_fiscal', '-created_at']
        unique_together = ['tenant', 'nombre', 'ejercicio_fiscal']

    def __str__(self):
        return f"{self.nombre} ({self.ejercicio_fiscal})"


class ItemClavePres(models.Model):
    """
    Clave presupuestaria individual dentro de una plantilla.
    Cada registro representa una línea de la plantilla de claves
    presupuestarias con todos sus clasificadores.
    """
    objects: Any
    DoesNotExist: Any

    plantilla = models.ForeignKey(
        PlantillaPresupuestal,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Plantilla'
    )

    # Clasificadores presupuestarios
    unidad_ejecutora_gasto = models.CharField(
        max_length=20,
        verbose_name='Unidad Ejecutora del Gasto'
    )
    cog = models.CharField(
        max_length=10,
        verbose_name='COG',
        help_text='Clasificador por Objeto del Gasto, ej: "21611"'
    )
    cog_fondo = models.CharField(
        max_length=5,
        verbose_name='COG Fondo',
        help_text='4° dígito del COG — fondo'
    )
    cog_desagregacion = models.CharField(
        max_length=5,
        verbose_name='COG Desagregación',
        help_text='3° dígito del COG — desagregación'
    )
    clasificador_programatico = models.CharField(
        max_length=20,
        verbose_name='Clasificador Programático'
    )
    tipo_gasto = models.CharField(
        max_length=5,
        verbose_name='Tipo de Gasto'
    )
    finalidad_funcion = models.CharField(
        max_length=10,
        verbose_name='Finalidad / Función'
    )
    fuente_financiamiento = models.CharField(
        max_length=10,
        verbose_name='Fuente de Financiamiento'
    )
    clasificador_economico = models.CharField(
        max_length=20,
        verbose_name='Clasificador Económico'
    )
    actividad_institucional = models.CharField(
        max_length=20,
        verbose_name='Actividad Institucional'
    )
    programa_presupuestario = models.CharField(
        max_length=20,
        verbose_name='Programa Presupuestario'
    )
    accion = models.CharField(
        max_length=10,
        verbose_name='Acción'
    )
    descripcion = models.TextField(
        verbose_name='Descripción'
    )

    class Meta:
        verbose_name = 'Clave Presupuestaria'
        verbose_name_plural = 'Claves Presupuestarias'
        ordering = ['id']

    def __str__(self):
        return f"COG {self.cog} — {self.descripcion[:60]}"
