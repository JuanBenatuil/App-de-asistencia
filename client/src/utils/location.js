export async function getCurrentPosition() {
  if (!navigator.geolocation) {
    throw new Error("Tu navegador no soporta geolocalizacion.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      () => reject(new Error("No fue posible obtener tu ubicacion.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
