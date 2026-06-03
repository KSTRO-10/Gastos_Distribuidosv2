"""
Area/Department models.
"""

from django.db import models
from django.conf import settings


class Area(models.Model):
    """
    Area/Department within a company.
    """
    
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='areas',
        verbose_name='Empresa'
    )
    name = models.CharField(max_length=255, verbose_name='Nombre')
    code = models.CharField(max_length=50, blank=True, verbose_name='Código')
    description = models.TextField(blank=True, verbose_name='Descripción')
    
    # Manager
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_areas',
        verbose_name='Responsable'
    )
    
    # Parent area (for hierarchy)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Área padre'
    )
    
    # Budget
    presupuesto_anual = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name='Presupuesto anual'
    )
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name='Activa')
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='areas_created',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Área'
        verbose_name_plural = 'Áreas'
        ordering = ['company', 'name']
        unique_together = ['company', 'code']

    def __str__(self):
        return f"{self.name} ({self.company.razon_social})"


class PersonalArea(models.Model):
    """
    Staff/Personnel assigned to an area.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='area_assignments',
        verbose_name='Usuario'
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='staff',
        verbose_name='Área'
    )
    cargo = models.CharField(max_length=255, blank=True, verbose_name='Cargo')
    is_primary = models.BooleanField(default=True, verbose_name='Área principal')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de asignación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Personal del Área'
        verbose_name_plural = 'Personal de las Áreas'
        unique_together = ['user', 'area']

    def __str__(self):
        return f"{self.user.full_name} - {self.area.name}"
