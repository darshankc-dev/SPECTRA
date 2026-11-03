"""Accounts and role management using Django Groups and permissions."""
from django.contrib.auth.models import Group, User
from rest_framework.permissions import BasePermission

ROLE_ADMINISTRATOR = "ADMINISTRATOR"
ROLE_ENGINEER = "ENGINEER"
ROLE_SUPERVISOR = "SUPERVISOR"

ALL_ROLES = (ROLE_ADMINISTRATOR, ROLE_ENGINEER, ROLE_SUPERVISOR)


def ensure_role_groups():
    """Ensure the three official Django Groups exist."""
    for role_name in ALL_ROLES:
        Group.objects.get_or_create(name=role_name)


def assign_user_role(user: User, role_name: str) -> None:
    """Assign a user to one of the three official role groups."""
    if role_name not in ALL_ROLES:
        raise ValueError(f"Unsupported role: {role_name}")
    ensure_role_groups()
    user.groups.clear()
    group = Group.objects.get(name=role_name)
    user.groups.add(group)
    if role_name == ROLE_ADMINISTRATOR:
        user.is_staff = True
        user.save(update_fields=["is_staff"])


def get_user_role(user) -> str:
    """Return the canonical role for a user."""
    if not user or not user.is_authenticated:
        return ""
    group_names = set(user.groups.values_list("name", flat=True))
    if ROLE_ADMINISTRATOR in group_names or user.is_superuser:
        return ROLE_ADMINISTRATOR
    if ROLE_SUPERVISOR in group_names:
        return ROLE_SUPERVISOR
    if ROLE_ENGINEER in group_names:
        return ROLE_ENGINEER
    # Default authenticated user without explicit group is treated as ENGINEER
    return ROLE_ENGINEER


def get_dashboard_url_for_user(user) -> str:
    """Return the role-specific dashboard path after login."""
    role = get_user_role(user)
    if role == ROLE_ADMINISTRATOR:
        return "/admin-console/"
    if role == ROLE_SUPERVISOR:
        return "/supervisor/"
    return "/engineer/"


class IsAdministrator(BasePermission):
    message = "Administrator privileges are required for this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_role(request.user) == ROLE_ADMINISTRATOR
        )


class IsEngineer(BasePermission):
    message = "Engineer privileges are required for this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_role(request.user) == ROLE_ENGINEER
        )


class IsSupervisor(BasePermission):
    message = "Supervisor privileges are required to review inspections. Engineers and unauthorized roles are denied."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_role(request.user) == ROLE_SUPERVISOR
        )


class IsSupervisorOrAdministrator(BasePermission):
    message = "Supervisor or Administrator privileges are required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_role(request.user) in (ROLE_SUPERVISOR, ROLE_ADMINISTRATOR)
        )


class IsEngineerOrAdministrator(BasePermission):
    message = "Engineer or Administrator privileges are required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_role(request.user) in (ROLE_ENGINEER, ROLE_ADMINISTRATOR)
        )
