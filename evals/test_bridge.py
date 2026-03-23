"""Test the MCP Client ↔ Server bridge without calling Claude."""

import asyncio
import os
from mcp_client import McpHttpClient

async def test_bridge():
    # 1. Check if server is likely running
    client = McpHttpClient(base_url="http://localhost:3001", debug=True)
    
    print("🚀 Testing MCP Bridge (No LLM required)...")
    
    try:
        # 2. Test Initialization (Fixes HTTP 406 and ReadError)
        print("⏳ Initializing MCP session...")
        await client.initialize()
        print("✅ Session Initialized!")

        # 3. Test a Direct Tool Call (Proxies to your local server)
        print("⏳ Calling 'lookup_legislator' tool...")
        # Note: This requires UTAH_LEGISLATURE_API_KEY and UGRC_API_KEY to be set in the server's env
        result = await client.call_tool(
            "lookup_legislator", 
            {"street": "350 State St", "zone": "84111"}
        )
        
        print("\n🎉 Bridge Success!")
        print(f"Result: {result[:200]}...")

    except Exception as e:
        print(f"\n❌ Bridge Failed: {type(e).__name__}: {e}")
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_bridge())
