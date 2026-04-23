/**
 * Otimiza uma imagem redimensionando-a e convertendo para um formato comprimido.
 * @param {File|string} fileOrBase64 - O arquivo original ou string base64.
 * @param {number} maxWidth - Largura máxima permitida (default 800px).
 * @param {number} quality - Qualidade da compressão (0 a 1).
 * @returns {Promise<string>} - String base64 da imagem otimizada.
 */
export async function compressImage(fileOrBase64, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Mantém proporção
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Converte para base64 comprimido
      const optimizedBase64 = canvas.toDataURL("image/jpeg", quality);
      resolve(optimizedBase64);
    };

    img.onerror = (err) => reject(err);

    // Se for um objeto File, converte para base64 primeiro
    if (fileOrBase64 instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      reader.readAsDataURL(fileOrBase64);
    } else {
      img.src = fileOrBase64;
    }
  });
}
