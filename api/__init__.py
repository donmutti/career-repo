"""Career Repo API."""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("career-repo")
except PackageNotFoundError:
    __version__ = "0.0.0"
