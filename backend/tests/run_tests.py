import sys
import asyncio

sys.path.insert(0, 'backend')
from app.main import health_check

async def main():
    print("Testing health check directly...")
    result = await health_check()
    print("Success:", result.success)
    print("Message:", result.message)
    print("Data:", result.data)
    print("Meta:", result.meta)
    assert result.success is True
    print("\nALL BACKEND CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
