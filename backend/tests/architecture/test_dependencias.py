import shutil
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]


def test_camadas_respeitam_a_clean_architecture():
    lint_imports = shutil.which("lint-imports")
    assert lint_imports is not None, "lint-imports não encontrado no PATH do ambiente"

    resultado = subprocess.run(
        [lint_imports],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )

    assert resultado.returncode == 0, resultado.stdout + resultado.stderr
