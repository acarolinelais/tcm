async def test_health_responde_200_sem_autenticacao(api_client):
    response = await api_client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_rota_inexistente_continua_404(api_client):
    response = await api_client.get("/api/health/detalhes")

    assert response.status_code == 404
