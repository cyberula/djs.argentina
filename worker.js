export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/registro' && request.method === 'POST') {
      return handleSignup(request, env, ctx);
    }

    // Captura subdominios: algo.djs.ar
    const hostname = url.hostname.toLowerCase();
    if (hostname !== env.ROOT_DOMAIN && hostname.endsWith(`.${env.ROOT_DOMAIN}`)) {
      const subdomain = hostname.replace(`.${env.ROOT_DOMAIN}`, '');
      if (subdomain === 'www') {
        return env.ASSETS.fetch(request);
      }

      const profile = await env.PROFILES.get(`profile:${subdomain}`, { type: 'json' });
      if (!profile) {
        return new Response(renderNotFound(subdomain), {
          headers: { 'Content-Type': 'text/html; charset=UTF-8' },
          status: 404,
        });
      }

      return new Response(renderProfile(profile), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleSignup(request, env, ctx) {
  const form = await request.formData();
  const stageName = (form.get('stage_name') || '').trim();
  const email = (form.get('email') || '').trim().toLowerCase();
  const subdomain = (form.get('subdomain') || '').trim().toLowerCase();

  if (!stageName || !email || !subdomain) {
    return json({ error: 'Faltan campos obligatorios.' }, 422);
  }

  if (!/^[a-z0-9-]{3,32}$/.test(subdomain)) {
    return json({ error: 'El subdominio solo puede contener minúsculas, números y guiones.' }, 422);
  }

  const existing = await env.PROFILES.get(`profile:${subdomain}`);
  if (existing) {
    return json({ error: 'Ese subdominio ya está registrado.' }, 409);
  }

  const profileImage = form.get('profile_image');
  let imageUrl = null;
  if (profileImage && typeof profileImage.stream === 'function') {
    const key = `profile-images/${subdomain}-${Date.now()}.${detectExtension(profileImage.type)}`;
    await env.MEDIA_BUCKET.put(key, profileImage.stream(), {
      httpMetadata: {
        contentType: profileImage.type,
      },
    });
    imageUrl = `https://media.djs.ar/${key}`; // Ajusta al dominio público de R2
  }

  const profile = {
    subdomain,
    stageName,
    email,
    location: (form.get('location') || '').trim(),
    genre: (form.get('genre') || '').trim(),
    instagram: (form.get('instagram') || '').trim(),
    soundcloud: (form.get('soundcloud') || '').trim(),
    youtube: (form.get('youtube') || '').trim(),
    bandcamp: (form.get('bandcamp') || '').trim(),
    bio: (form.get('bio') || '').trim(),
    embed: (form.get('embed') || '').trim(),
    techRider: (form.get('tech_rider') || '').trim(),
    imageUrl,
    createdAt: new Date().toISOString(),
    approved: false,
  };

  await env.PROFILES.put(`profile:${subdomain}`, JSON.stringify(profile));

  // Enviar correo o notificación opcional mediante un Webhook
  if (env.SLACK_WEBHOOK) {
    ctx.waitUntil(postSlack(env.SLACK_WEBHOOK, profile));
  }

  return json({ ok: true, profile });
}

function detectExtension(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return 'bin';
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  });
}

async function postSlack(webhook, profile) {
  return fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Nuevo registro DJ: ${profile.stageName} (${profile.subdomain}.djs.ar)`
    }),
  });
}

function renderNotFound(subdomain) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subdomain}.djs.ar · Perfil no encontrado</title>
<style>
  body { margin:0; font-family:Inter, sans-serif; background:#050505; color:#f5f5f5; display:grid; min-height:100vh; place-items:center; }
  main { max-width:560px; padding:48px 32px; text-align:center; border:1px solid rgba(255,255,255,0.08); border-radius:18px; background:#111; }
  h1 { font-size:2rem; margin-bottom:12px; }
  p { color:#8a8a8a; }
  a { color:#f5ff2b; text-transform:uppercase; letter-spacing:0.1em; font-size:0.8rem; }
</style>
</head>
<body>
<main>
  <h1>Perfil en proceso</h1>
  <p>Aún no hay contenido para <strong>${subdomain}.djs.ar</strong>. Si sos el DJ, revisá tu correo para confirmar el alta.</p>
  <p><a href="https://djs.ar">Volver a djs.ar</a></p>
</main>
</body>
</html>`;
}

function renderProfile(profile) {
  const socials = [
    ['Instagram', profile.instagram],
    ['SoundCloud', profile.soundcloud],
    ['YouTube', profile.youtube],
    ['Bandcamp / Spotify', profile.bandcamp],
  ].filter(([, url]) => url);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${profile.stageName} · djs.ar</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { font-family:Inter,sans-serif; color-scheme:dark; }
  body { margin:0; background:#050505; color:#f5f5f5; }
  header { padding:64px 24px 32px; max-width:960px; margin:0 auto; display:grid; gap:32px; grid-template-columns:200px 1fr; align-items:center; }
  .avatar { border-radius:18px; overflow:hidden; background:#111; aspect-ratio:1; display:flex; }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  h1 { margin:0 0 8px; font-size:2.6rem; }
  .meta { text-transform:uppercase; letter-spacing:0.12em; font-size:0.75rem; color:#8a8a8a; }
  .bio { max-width:720px; margin:0 auto; padding:0 24px 48px; color:#c8c8c8; line-height:1.7; }
  .embed { max-width:960px; margin:0 auto 48px; padding:0 24px; }
  .embed iframe { width:100%; min-height:360px; border:0; border-radius:18px; }
  .grid { max-width:960px; margin:0 auto; padding:0 24px 64px; display:grid; gap:32px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .card { background:#111; border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:24px; display:grid; gap:12px; }
  .card h2 { margin:0; font-size:1rem; text-transform:uppercase; letter-spacing:0.12em; color:#8a8a8a; }
  .card ul { margin:0; padding:0; list-style:none; display:grid; gap:8px; }
  .card a { color:#f5ff2b; text-decoration:none; font-size:0.95rem; }
  .rider { white-space:pre-wrap; color:#c8c8c8; font-size:0.95rem; }
  footer { text-align:center; padding:48px 24px; color:#8a8a8a; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em; }
  @media (max-width:780px) { header { grid-template-columns:1fr; text-align:center; } .avatar { justify-self:center; max-width:220px; } }
</style>
</head>
<body>
<header>
  <div class="avatar">${profile.imageUrl ? `<img src="${profile.imageUrl}" alt="${profile.stageName}" />` : ''}</div>
  <div>
    <div class="meta">${profile.location} · ${profile.genre}</div>
    <h1>${profile.stageName}</h1>
    <div class="meta">${profile.subdomain}.djs.ar</div>
  </div>
</header>
<section class="bio"><p>${profile.bio.replace(/\n/g, '<br>')}</p></section>
<section class="embed">${profile.embed}</section>
<section class="grid">
  <article class="card">
    <h2>Socials</h2>
    <ul>
      ${socials.map(([label, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${label}</a></li>`).join('')}
    </ul>
  </article>
  <article class="card">
    <h2>Rider técnico</h2>
    <div class="rider">${profile.techRider.replace(/\n/g, '<br>')}</div>
  </article>
</section>
<footer>
  <p>djs.ar · escena electrónica argentina</p>
</footer>
</body>
</html>`;
}

