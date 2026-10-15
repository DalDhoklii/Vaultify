def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_login(client, auth_headers):
    res = client.post(
        "/auth/login", data={"username": "t@example.com", "password": "secret12"}
    )
    assert res.status_code == 200
    assert "access_token" in res.json()

    bad = client.post(
        "/auth/login", data={"username": "t@example.com", "password": "wrong"}
    )
    assert bad.status_code == 401


def test_requires_auth(client):
    assert client.get("/transactions/").status_code == 401


def _category(client, headers, name="Food", type_="expense"):
    res = client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    )
    assert res.status_code == 200
    return res.json()


def test_deleting_category_keeps_transactions(client, auth_headers):
    cat = _category(client, auth_headers)
    client.post(
        "/transactions/",
        json={"amount": 10, "type": "expense", "category_id": cat["id"]},
        headers=auth_headers,
    )
    client.delete(f"/categories/{cat['id']}", headers=auth_headers)

    txs = client.get("/transactions/", headers=auth_headers).json()
    assert len(txs) == 1
    assert txs[0]["category_id"] is None


def test_category_type_must_match(client, auth_headers):
    cat = _category(client, auth_headers)
    res = client.post(
        "/transactions/",
        json={"amount": 10, "type": "income", "category_id": cat["id"]},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_can_clear_category_on_update(client, auth_headers):
    cat = _category(client, auth_headers)
    tx = client.post(
        "/transactions/",
        json={"amount": 10, "type": "expense", "category_id": cat["id"]},
        headers=auth_headers,
    ).json()
    assert tx["date"] is not None

    res = client.put(
        f"/transactions/{tx['id']}", json={"category_id": None}, headers=auth_headers
    )
    assert res.status_code == 200
    assert res.json()["category_id"] is None
    assert res.json()["amount"] == 10


def test_rename_to_duplicate_category_is_400(client, auth_headers):
    _category(client, auth_headers, "Food")
    other = _category(client, auth_headers, "Rent")
    res = client.put(
        f"/categories/{other['id']}", json={"name": "Food"}, headers=auth_headers
    )
    assert res.status_code == 400


def test_search_treats_percent_literally(client, auth_headers):
    for desc in ("50% off", "groceries"):
        client.post(
            "/transactions/",
            json={"amount": 5, "type": "expense", "description": desc},
            headers=auth_headers,
        )
    res = client.get("/transactions/", params={"q": "%"}, headers=auth_headers)
    assert [t["description"] for t in res.json()] == ["50% off"]


def test_pagination_headers(client, auth_headers):
    for i in range(3):
        client.post(
            "/transactions/",
            json={"amount": i + 1, "type": "income"},
            headers=auth_headers,
        )
    res = client.get(
        "/transactions/", params={"page": 1, "page_size": 2}, headers=auth_headers
    )
    assert len(res.json()) == 2
    assert res.headers["x-total-count"] == "3"
