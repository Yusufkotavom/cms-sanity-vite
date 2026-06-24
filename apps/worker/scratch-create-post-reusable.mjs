import fs from 'fs';
import path from 'path';

const API_URL = "https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev";
const TOKEN = "06dad90329ffeae9d7f884407e2cb962438775687fdf9213";
const WORKSPACE = "kotacom-studio-migrate-dev";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: node scratch-create-post-reusable.mjs <slug> <title> <content-md-file-path>");
    process.exit(1);
  }

  const [slug, title, filePath] = args;
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found at ${absolutePath}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(absolutePath, 'utf8');

  console.log(`Creating post with slug: "${slug}" in workspace "${WORKSPACE}"...`);
  
  const createRes = await fetch(API_URL + "/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN,
      "X-Workspace-Slug": WORKSPACE
    },
    body: JSON.stringify({
      title: title,
      slug: slug,
      contentMd: markdownContent,
      outlineMd: "",
      excerpt: `Jasa cetak buku professional di Surabaya. Cetak novel, buku ajar, biografi, dan majalah dengan kualitas premium.`,
      seoTitle: title,
      seoDescription: `Cari jasa cetak buku di Surabaya? Hubungi kami untuk cetak novel, buku ajar, hardcover/softcover, kualitas tajam, jilid kuat, dan harga terjangkau.`,
      seoKeywords: "cetak buku surabaya, jasa cetak buku, cetak novel surabaya, cetak buku satuan",
      ogTitle: title,
      ogDescription: `Layanan cetak buku premium di Surabaya. Cetak satuan hingga ribuan, jilid kuat lem panas, digital & offset printing.`,
      categoryIds: []
    })
  });

  if (!createRes.ok) {
    console.error("Failed to create post:", await createRes.text());
    process.exit(1);
  }

  const note = await createRes.json();
  console.log(`Created Post ID: ${note.id} with slug: ${slug}`);

  console.log("Publishing post to Sanity...");
  const publishRes = await fetch(API_URL + "/api/notes/" + note.id + "/publish", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + TOKEN,
      "X-Workspace-Slug": WORKSPACE
    }
  });

  if (!publishRes.ok) {
    console.error("Failed to publish post:", await publishRes.text());
    process.exit(1);
  }

  const result = await publishRes.json();
  console.log("Publish successful!", result);
}

main().catch(console.error);
