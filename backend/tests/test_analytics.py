
def test_analytics_endpoints_return_expected_shapes(client):
    summary = client.get("/api/v1/analytics/summary")
    assert summary.status_code == 200
    assert "total_reports" in summary.json
    assert "by_status" in summary.json

    categories = client.get("/api/v1/analytics/categories")
    assert categories.status_code == 200
    assert isinstance(categories.json, list)

    statuses = client.get("/api/v1/analytics/statuses")
    assert statuses.status_code == 200
    assert isinstance(statuses.json, list)

    trends = client.get("/api/v1/analytics/trends?days=7")
    assert trends.status_code == 200
    assert len(trends.json["daily_reports"]) == 7


def test_trends_reject_invalid_day_ranges(client):
    assert client.get("/api/v1/analytics/trends?days=0").status_code == 400
    assert client.get("/api/v1/analytics/trends?days=abc").status_code == 400
