export const formatRut = (value: string) => {
    // Remove everything but numbers and K
    const clean = value.toUpperCase().replace(/[^0-9K]/g, '');
    if (!clean) return '';

    let result = '';
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    if (body.length > 0) {
        const parts = [];
        for (let i = body.length; i > 0; i -= 3) {
            parts.unshift(body.slice(Math.max(0, i - 3), i));
        }
        result = parts.join('.') + '-' + dv;
    } else {
        result = dv;
    }
    return result;
};
