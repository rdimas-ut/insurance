import logging

import azure.functions as func
from intuitlib.client import AuthClient
from intuitlib.enums import Scopes

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    client_id = ""
    client_secret = ""
    redirect_uri = ""
    environment = "production"

    auth_client = AuthClient(
        client_id,
        client_secret,
        redirect_uri,
        environment
    )

    scopes = [
        Scopes.ACCOUNTING, Scopes.PAYMENT, Scopes.OPENID, Scopes. PROFILE,
        Scopes.EMAIL, Scopes.PHONE, Scopes. ADDRESS
    ]

    auth_url = auth_client.get_authorization_url(scopes)
    return func.HttpResponse(auth_url,status_code=200)
    