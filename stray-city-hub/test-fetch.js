async function test() {
  const url = 'https://www.allaccess.com.ar/event/stray-kids';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });
    const text = await res.text();
    console.log("Sample:", text.substring(0, 500));
    console.log("Sold out mention:", text.toLowerCase().includes('sold out') || text.toLowerCase().includes('agotad'));
  } catch(e) {
    console.error(e);
  }
}
test();
