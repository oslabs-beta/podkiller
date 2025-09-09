export async function startMinikube() {
  try {
    const response = await fetch('/api/minikube/start', {
      method: 'POST',
    });
    const data = await response.json();
    console.log('Minikube start response', data);
    return data;
  } catch (err) {
    console.error('Error starting Minikube', err);
  }
}

export async function stopMinikube() {
  try {
    const response = await fetch('/api/minikube/stop', {
      method: 'POST',
    });
    const data = await response.json();
    console.log('Minikube stop response', data);
    return data;
  } catch (err) {
    console.error('Error stopping Minikube', err);
  }
}
