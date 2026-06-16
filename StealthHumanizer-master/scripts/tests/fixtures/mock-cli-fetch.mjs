const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });

globalThis.fetch = async (url, init = {}) => {
  let parsedUrl;
  try { parsedUrl = new URL(String(url)); } catch { parsedUrl = new URL("http://localhost"); }
  const href = parsedUrl.href;

  if (parsedUrl.pathname.endsWith("corpus-style-model.json")) {
    return new Response("not found", { status: 404 });
  }

  if (parsedUrl.hostname === "generativelanguage.googleapis.com") {
    const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
    const prompt = body?.contents?.[0]?.parts?.[0]?.text || "";

    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: prompt.includes("__PROTECT_")
                  ? "This rewritten paragraph keeps __PROTECT_0__ intact. It reads naturally now."
                  : "This rewritten paragraph keeps its meaning intact. It reads naturally now.",
              },
            ],
          },
        },
      ],
    });
  }

  return jsonResponse(
    { error: { message: `Unexpected mocked fetch URL: ${href}` } },
    { status: 500 },
  );
};
