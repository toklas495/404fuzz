const SAFE = new Set([
  '-', '_', '.', '~', '/', '?', ':', '@', '=', '&'
]);

export function smartEncodeFuzz(fuzz) {
    let out = "";
    const len = fuzz.length;

    for (let i = 0; i < len; i++) {
        const ch = fuzz[i];
        const code = ch.charCodeAt(0);

        // 1) If "%xx" keep as-is
        if (ch === '%' && i + 2 < len) {
            const h1 = fuzz[i+1], h2 = fuzz[i+2];
            if (
                (h1 >= '0' && h1 <= '9' || h1.toUpperCase() >= 'A' && h1.toUpperCase() <= 'F') &&
                (h2 >= '0' && h2 <= '9' || h2.toUpperCase() >= 'A' && h2.toUpperCase() <= 'F')
            ) {
                out += '%' + h1 + h2;
                i += 2;
                continue;
            }
        }

        // 2) Alphanumeric always allowed
        if (
            (code >= 48 && code <= 57) ||   // 0-9
            (code >= 65 && code <= 90) ||   // A-Z
            (code >= 97 && code <= 122) ||  // a-z
            SAFE.has(ch)
        ) {
            out += ch;
            continue;
        }

        // 3) Everything else encode
        out += '%' + code.toString(16).padStart(2, '0').toUpperCase();
    }

    return out;
}
