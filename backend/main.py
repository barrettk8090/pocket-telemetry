from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import logging
from dimo import DIMO

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DIMO Telemetry Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:5173",
        "https://pocket-telemetry-frontend.onrender.com",  # Temporary - allows all Render apps
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthRequest(BaseModel):
    client_id: str
    redirect_uri: str
    api_key: str
    vehicle_token_id: str

class AuthResponse(BaseModel):
    vehicle_jwt: str
    expires_in: int
    message: str

@app.get("/")
async def root():
    return {"message": "DIMO Telemetry Backend API", "status": "running"}

@app.post("/api/auth/vehicle-jwt", response_model=AuthResponse)
async def get_vehicle_jwt(auth_request: AuthRequest):
    """
    Generate a Vehicle JWT using the DIMO Python SDK v1.4.0
    """
    try:
        logger.info(f"Generating Vehicle JWT for client_id: {auth_request.client_id}")
        
        # Initialize DIMO client for Production environment
        dimo = DIMO("Production")
        
        # Step 1: Generate Developer JWT
        logger.info("Step 1: Generating Developer JWT...")
        developer_jwt_response = dimo.auth.get_dev_jwt(
            client_id=auth_request.client_id,
            domain=auth_request.redirect_uri,
            private_key=auth_request.api_key
        )
        
        developer_jwt = developer_jwt_response["access_token"]
        logger.info("✅ Developer JWT generated successfully")
        
        # Step 2: Exchange for Vehicle JWT (streamlined method - no privileges needed)
        logger.info("Step 2: Exchanging for Vehicle JWT...")
        
        vehicle_jwt_response = dimo.token_exchange.exchange(
            developer_jwt=developer_jwt,
            token_id=int(auth_request.vehicle_token_id)
        )
        
        logger.info("✅ Vehicle JWT generated successfully")
        
        return AuthResponse(
            vehicle_jwt=vehicle_jwt_response['token'],
            expires_in=vehicle_jwt_response.get('expires_in', 3600),  # Default 1 hour
            message="Vehicle JWT generated successfully"
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error generating Vehicle JWT: {str(e)}")
        error_message = str(e)
        
        # Provide more specific error messages based on common issues
        if "invalid client" in error_message.lower() or "client_id" in error_message.lower():
            raise HTTPException(status_code=400, detail="Invalid Client ID. Please check your Developer License.")
        elif "invalid domain" in error_message.lower() or "domain" in error_message.lower():
            raise HTTPException(status_code=400, detail="Invalid Redirect URI. Please check your domain configuration.")
        elif "invalid signature" in error_message.lower() or "private_key" in error_message.lower():
            raise HTTPException(status_code=400, detail="Invalid API Key. Please check your private key.")
        elif "token not found" in error_message.lower() or "token_id" in error_message.lower():
            raise HTTPException(status_code=404, detail="Vehicle Token ID not found. Please check the token ID.")
        elif "insufficient privileges" in error_message.lower() or "permissions" in error_message.lower():
            raise HTTPException(status_code=403, detail="Insufficient permissions for this vehicle. Please ensure you have telemetry access.")
        elif "unauthorized" in error_message.lower():
            raise HTTPException(status_code=401, detail="Authentication failed. Please check your credentials.")
        else:
            raise HTTPException(status_code=500, detail=f"Authentication failed: {error_message}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend server is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Render sets PORT automatically
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)  # reload=False for production 