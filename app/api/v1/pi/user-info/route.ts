import { NextRequest, NextResponse } from "next/server";

// Pi Platform API 统一使用同一个端点
// 环境区分通过 access token 实现（sandbox token 获取 testnet 数据）
const PI_API_BASE_URL = "https://api.minepi.com/v2";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const accessToken = authHeader.substring(7);

  try {
    console.log("=== Calling Pi Platform API /me endpoint ===");
    console.log("API URL:", `${PI_API_BASE_URL}/me`);
    console.log("Access token (first 20 chars):", accessToken.substring(0, 20) + "...");

    // 调用 Pi Platform API 的 /me endpoint
    // 根据文档：GET /me - Authorization method: Access token
    const response = await fetch(`${PI_API_BASE_URL}/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Pi API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pi API error (${response.status}):`, errorText);

      // 提供更详细的错误信息
      let errorMessage = `Pi Platform API returned ${response.status}`;
      if (response.status === 401) {
        errorMessage = "Invalid or expired access token. Please login again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Please ensure wallet_address scope was granted.";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorText
        },
        { status: response.status }
      );
    }

    const userData = await response.json();
    console.log("Pi Platform API response:", JSON.stringify(userData, null, 2));

    // 检查是否有 wallet_address
    if (!userData.wallet_address) {
      console.warn("Warning: wallet_address not present in response. User may not have created wallet yet.");
    }

    // 返回用户数据
    // 注意：network 信息从 Pi SDK 初始化时的 sandbox 参数推断
    return NextResponse.json({
      success: true,
      data: {
        uid: userData.uid,
        username: userData.username,
        wallet_address: userData.wallet_address || null,
        // Pi Platform 会根据 access token 返回对应环境的数据
        // 前端 SDK 的 sandbox: true 生成的 token 会返回 testnet 数据
        network: process.env.NODE_ENV === "production" ? "mainnet" : "testnet",
      },
    });
  } catch (error) {
    console.error("Error fetching Pi user data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user data from Pi Platform"
      },
      { status: 500 }
    );
  }
}

