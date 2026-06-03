const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('fetch starting');
  try {
    const response = await originalFetch(...args);
    return response;
  } finally {
    console.log('fetch done');
  }
}
