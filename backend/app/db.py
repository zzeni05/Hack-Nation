"""Supabase client. Uncomment when you need persistence."""
from app.config import settings

# from supabase import Client, create_client
#
# _client: Client | None = None
#
#
# def get_db() -> Client:
#     global _client
#     if _client is None:
#         if not settings.supabase_url or not settings.supabase_key:
#             raise RuntimeError("Supabase not configured")
#         _client = create_client(settings.supabase_url, settings.supabase_key)
#     return _client
#
# Example usage:
# db = get_db()
# result = db.table("submissions").insert({"prompt": prompt, "response": response}).execute()
