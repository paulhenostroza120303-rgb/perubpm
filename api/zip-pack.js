import JSZip from "jszip";

export const config = {
    maxDuration: 60 // permite hasta 60s (plan free)
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { packName, files } = req.body;

        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: "No files received" });
        }

        const zip = new JSZip();
        let added = 0;

        for (const f of files) {
            if (!f.referenceId || !f.name) continue;

            const url = `https://api.perubpm.com/catalog/drive/download/${f.referenceId}?fileName=${encodeURIComponent(f.name)}`;

            try {
                const r = await fetch(url);

                if (!r.ok) {
                    console.warn("Skip file:", f.name);
                    continue;
                }

                const arrayBuffer = await r.arrayBuffer();
                zip.file(f.name, Buffer.from(arrayBuffer));
                added++;

            } catch (fileErr) {
                console.warn("Error file:", f.name, fileErr);
            }
        }

        if (added === 0) {
            return res.status(500).json({ error: "No files could be added to ZIP" });
        }

        const zipBuffer = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        });

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${(packName || "pack").replace(/[^a-z0-9]/gi, "_")}.zip"`
        );

        return res.status(200).send(zipBuffer);

    } catch (err) {
        console.error("ZIP PACK ERROR:", err);
        return res.status(500).json({
            error: "ZIP generation failed",
            detail: err.message
        });
    }
}
