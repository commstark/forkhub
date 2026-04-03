import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  const fontData = await fetch(
    "https://fonts.gstatic.com/s/instrumentserif/v6/Qw3TZQpMCyTtJSvDWBXbS8hS0TFq9rXleoDE.woff"
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#f8f6f3",
          padding: "80px 96px",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            width: "64px",
            height: "4px",
            background: "#c2724f",
            marginBottom: "40px",
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontFamily: "Instrument Serif",
            fontSize: "96px",
            fontStyle: "italic",
            color: "#c2724f",
            lineHeight: 1.05,
            marginBottom: "24px",
          }}
        >
          The Fork Hub
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: "32px",
            color: "#44403c",
            lineHeight: 1.4,
            maxWidth: "760px",
          }}
        >
          The control plane for employee-built AI tools
        </div>

        {/* URL — pinned to bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "64px",
            left: "96px",
            fontFamily: "sans-serif",
            fontSize: "22px",
            color: "#a8a29e",
            letterSpacing: "0.02em",
          }}
        >
          www.theforkhub.net
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Instrument Serif",
          data: fontData,
          style: "italic",
          weight: 400,
        },
      ],
    }
  )
}
