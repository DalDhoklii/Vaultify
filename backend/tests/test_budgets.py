from datetime import datetime


def _category(client, headers, name, type_="expense"):
    return client.post(
        "/categories/", json={"name": name, "type": type_}, headers=headers
    ).json()


def _expense(client, headers, amount, category_id, date=None):
    body = {"amount": amount, "type": "expense", "category_id": category_id}
    if date:
        body["date"] = date
    return client.post("/transactions/", json=body, headers=headers)


def test_budget_crud(client, auth_headers):
    food = _category(client, auth_headers, "Food")
    res = client.post(
        "/budgets/",
        json={"category_id": food["id"], "amount": 5000},
        headers=auth_headers,
    )
    assert res.status_code == 201
    budget = res.json()

    # duplicate budget for the same category is rejected
    dup = client.post(
        "/budgets/", json={"category_id": food["id"], "amount": 1}, headers=auth_headers
    )
    assert dup.status_code == 400

    res = client.put(
        f"/budgets/{budget['id']}", json={"amount": 6000}, headers=auth_headers
    )
    assert res.json()["amount"] == 6000

    assert len(client.get("/budgets/", headers=auth_headers).json()) == 1
    client.delete(f"/budgets/{budget['id']}", headers=auth_headers)
    assert client.get("/budgets/", headers=auth_headers).json() == []


def test_budget_only_for_expense_categories(client, auth_headers):
    salary = _category(client, auth_headers, "Salary", "income")
    res = client.post(
        "/budgets/",
        json={"category_id": salary["id"], "amount": 100},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_budget_status_counts_only_this_month(client, auth_headers):
    food = _category(client, auth_headers, "Food")
    rent = _category(client, auth_headers, "Rent")
    for cat, limit in ((food, 1000), (rent, 500)):
        client.post(
            "/budgets/",
            json={"category_id": cat["id"], "amount": limit},
            headers=auth_headers,
        )

    _expense(client, auth_headers, 300, food["id"], "2026-10-05T12:00:00")
    _expense(client, auth_headers, 550, food["id"], "2026-10-20T12:00:00")
    _expense(client, auth_headers, 999, food["id"], "2026-09-30T12:00:00")  # last month
    _expense(client, auth_headers, 600, rent["id"], "2026-10-01T12:00:00")

    res = client.get("/budgets/status?month=2026-10", headers=auth_headers).json()
    items = {i["category_name"]: i for i in res["items"]}

    assert items["Food"]["spent"] == 850
    assert items["Food"]["remaining"] == 150
    assert items["Food"]["status"] == "warning"  # 85%
    assert items["Rent"]["status"] == "over"  # 120%
    assert res["total_limit"] == 1500
    assert res["total_spent"] == 1450


def test_budget_status_defaults_to_current_month(client, auth_headers):
    res = client.get("/budgets/status", headers=auth_headers).json()
    assert res["month"] == datetime.utcnow().strftime("%Y-%m")
    assert res["items"] == []


def test_deleting_category_removes_its_budget(client, auth_headers):
    food = _category(client, auth_headers, "Food")
    client.post(
        "/budgets/",
        json={"category_id": food["id"], "amount": 100},
        headers=auth_headers,
    )
    client.delete(f"/categories/{food['id']}", headers=auth_headers)
    assert client.get("/budgets/", headers=auth_headers).json() == []
