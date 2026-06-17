export const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: "PDF Pilot Backend Running"
  });
};