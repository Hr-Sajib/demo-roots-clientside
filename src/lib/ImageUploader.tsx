const imageUpload = async (file: any) => {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    if (data.success) {
      return data.data.url; // ইমেজ লিংক রিটার্ন করবে
    } else {
      throw new Error("Failed to upload image.");
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

export default imageUpload;

