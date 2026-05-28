async function test() {
  const url = 'https://www.ticketmaster.co/event/stray-kids-straycity-2026';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Text length:", text.length);
    console.log("Sample:", text.substring(0, 200));
  } catch(e) {
    console.error(e);
  }
}
test();
