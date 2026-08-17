
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_KEY = process.env.POLLINATIONS_API_KEY;
const TEXT_MODEL = "pollinations-router/polli";
const IMAGE_MODEL = "gpt-image-2";

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "POLLINATIONS_API_KEY is missing in .env.local",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

    const userPrompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const imageData =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : "";

    if (!userPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 1. UNDERSTAND USER REQUEST
    // ==========================================

    const systemPrompt = `
You are the instruction interpreter for an architectural
AI rendering application.

The user writes naturally in Moroccan Darija, Arabic,
French, English, mixed languages, or Latin-character Darija.

Understand exactly what the user wants, even with slang,
short sentences, spelling mistakes, or informal wording.

Convert the request into ONE precise professional English
instruction for an architectural image model.

IMPORTANT:
- Preserve the user's exact intention.
- Do not invent major changes.
- Do not add objects unless requested.
- If an image is provided, treat it as the primary source of truth.
- Preserve the main building geometry, proportions, facade,
  windows, doors, balconies, roof, camera angle, perspective,
  framing and composition unless explicitly requested otherwise.
- If the user asks to modify the environment only, leave the
  main building unchanged.
- If the user asks to add people or cars, use a realistic,
  natural number and placement.
- Keep realistic architecture, scale, materials, lighting,
  shadows and perspective.
- Avoid distorted buildings, duplicated people, duplicated cars,
  floating objects and excessive CGI.
- Return ONLY the final English instruction.
`;

    const textResponse = await fetch(
      "https://gen.pollinations.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: TEXT_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.15,
        }),
      }
    );

    const textResponseBody =
      await textResponse.text();

    if (!textResponse.ok) {
      console.error(
        "POLLINATIONS TEXT ERROR:",
        textResponse.status,
        textResponseBody
      );

      return NextResponse.json(
        {
          success: false,
          error: `Prompt understanding failed (${textResponse.status}).`,
        },
        { status: textResponse.status }
      );
    }

    let textData: any;

    try {
      textData = JSON.parse(textResponseBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt interpreter returned invalid JSON.",
        },
        { status: 500 }
      );
    }

    const finalPrompt =
      dataToText(textData)?.trim();

    if (!finalPrompt) {
      console.error(
        "EMPTY TEXT RESPONSE:",
        textData
      );

      return NextResponse.json(
        {
          success: false,
          error: "Prompt interpreter returned no instruction.",
        },
        { status: 500 }
      );
    }

    console.log("USER REQUEST:", userPrompt);
    console.log("FINAL INTERNAL PROMPT:", finalPrompt);

    // ==========================================
    // 2. IMAGE EDITING
    // ==========================================

    if (imageData) {
      const match = imageData.match(
        /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i
      );

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error: "Uploaded image format is invalid.",
          },
          { status: 400 }
        );
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = match[2];

      const imageBuffer = Buffer.from(
        base64Data,
        "base64"
      );

      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
          ? "webp"
          : "jpg";

      const editPrompt = [
        "Edit the provided architectural image.",
        "",
        "The uploaded image is the primary visual reference.",
        "",
        "Make ONLY the changes requested by the user.",
        "Preserve the original main building and its architecture unless explicitly asked to change it.",
        "Preserve geometry, proportions, facade, windows, doors, balconies, roof, camera angle, perspective, framing and composition.",
        "Do not replace the building with a different building.",
        "Do not redesign the architecture.",
        "Do not change unrelated elements.",
        "",
        "USER REQUEST:",
        finalPrompt,
      ].join("\n");

      const form = new FormData();

      form.append(
        "image",
        new Blob(
          [imageBuffer],
          { type: mimeType }
        ),
        `architectural-render.${extension}`
      );

      form.append(
        "prompt",
        editPrompt
      );

      form.append(
        "model",
        IMAGE_MODEL
      );

      form.append(
        "n",
        "1"
      );

      form.append(
        "quality",
        "high"
      );

      form.append(
        "response_format",
        "b64_json"
      );

      form.append(
        "output_format",
        "png"
      );

      form.append(
        "size",
        "1024x1024"
      );

      const imageResponse = await fetch(
        "https://gen.pollinations.ai/v1/images/edits",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
          body: form,
        }
      );

      const imageResponseText =
        await imageResponse.text();

      console.log(
        "POLLINATIONS IMAGE EDIT STATUS:",
        imageResponse.status
      );

      if (!imageResponse.ok) {
        console.error(
          "POLLINATIONS IMAGE EDIT ERROR:",
          imageResponseText
        );

        return NextResponse.json(
          {
            success: false,
            error:
              `Image edit failed (${imageResponse.status}): ${imageResponseText}`,
          },
          { status: imageResponse.status }
        );
      }

      let imageDataResponse: any;

      try {
        imageDataResponse =
          JSON.parse(imageResponseText);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "Image edit returned invalid JSON.",
          },
          { status: 500 }
        );
      }

      const base64Image =
        imageDataResponse?.data?.[0]?.b64_json;

      const outputUrl =
        imageDataResponse?.data?.[0]?.url;

      if (
        typeof base64Image === "string" &&
        base64Image.length > 0
      ) {
        const generatedImage =
          `data:image/png;base64,${base64Image}`;

        return NextResponse.json({
          success: true,
          imageUrl: generatedImage,
          image: {
            url: generatedImage,
            content_type: "image/png",
          },
          mode: "edit",
          model: IMAGE_MODEL,
        });
      }

      if (
        typeof outputUrl === "string" &&
        outputUrl.length > 0
      ) {
        return NextResponse.json({
          success: true,
          imageUrl: outputUrl,
          image: {
            url: outputUrl,
            content_type: "image/png",
          },
          mode: "edit",
          model: IMAGE_MODEL,
        });
      }

      console.error(
        "IMAGE EDIT RESPONSE:",
        imageDataResponse
      );

      return NextResponse.json(
        {
          success: false,
          error: "Pollinations returned no edited image.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 3. TEXT TO IMAGE
    // ==========================================

    const generationResponse = await fetch(
      "https://gen.pollinations.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: finalPrompt,
          n: 1,
          quality: "high",
          response_format: "b64_json",
          output_format: "png",
          size: "1024x1024",
        }),
      }
    );

    const generationText =
      await generationResponse.text();

    console.log(
      "POLLINATIONS IMAGE GENERATION STATUS:",
      generationResponse.status
    );

    if (!generationResponse.ok) {
      console.error(
        "POLLINATIONS IMAGE GENERATION ERROR:",
        generationText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Image generation failed (${generationResponse.status}): ${generationText}`,
        },
        { status: generationResponse.status }
      );
    }

    let generationData: any;

    try {
      generationData =
        JSON.parse(generationText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Image generation returned invalid JSON.",
        },
        { status: 500 }
      );
    }

    const generatedBase64 =
      generationData?.data?.[0]?.b64_json;

    const generatedUrl =
      generationData?.data?.[0]?.url;

    if (
      typeof generatedBase64 === "string" &&
      generatedBase64.length > 0
    ) {
      const imageUrl =
        `data:image/png;base64,${generatedBase64}`;

      return NextResponse.json({
        success: true,
        imageUrl,
        image: {
          url: imageUrl,
          content_type: "image/png",
        },
        mode: "generation",
        model: IMAGE_MODEL,
      });
    }

    if (
      typeof generatedUrl === "string" &&
      generatedUrl.length > 0
    ) {
      return NextResponse.json({
        success: true,
        imageUrl: generatedUrl,
        image: {
          url: generatedUrl,
          content_type: "image/png",
        },
        mode: "generation",
        model: IMAGE_MODEL,
      });
    }

    console.error(
      "IMAGE GENERATION RESPONSE:",
      generationData
    );

    return NextResponse.json(
      {
        success: false,
        error: "Pollinations returned no generated image.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error(
      "GENERATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown generation error.",
      },
      { status: 500 }
    );
  }
}

function dataToText(data: any): string {
  const content =
    data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.text || "";
      })
      .join(" ")
      .trim();
  }

  return "";
}

