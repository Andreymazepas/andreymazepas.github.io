var renderer,
  scene,
  camera,
  composer,
  sphere,
  container,
  backgroundbox,
  particle;

window.onload = function () {
  init();
  animate();
};

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0.0);
  document.getElementById('canvas').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);

  camera.position.set(0, 0, 25);
  camera.position.z = 40;
  scene.add(camera);

  var geom = new THREE.OctahedronGeometry(7, 1);
  var geom2 = new THREE.BoxGeometry(15, 15, 15, 1, 1, 1);

  var mat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
  });
  var material = new THREE.MeshNormalMaterial();

  var mat2 = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    wireframe: true,
    side: THREE.DoubleSide,
  });

  var sphere_geometry = new THREE.SphereGeometry(1, 128, 128);
  sphere = new THREE.Mesh(sphere_geometry, mat);
  sphere.scale.x = sphere.scale.y = sphere.scale.z = 5;
  scene.add(sphere);

  container = new THREE.Mesh(geom, mat2);
  scene.add(container);

  var boxMesh = new THREE.Mesh(geom2, material);
  boxMesh.doubleSided = true;
  boxMesh.scale.x = boxMesh.scale.y = boxMesh.scale.z = 15;
  //backgroundbox.add(boxMesh);

  var ambientLight = new THREE.AmbientLight(0x999999);
  //  scene.add(ambientLight);

  var lights = [];
  lights[0] = new THREE.DirectionalLight(0xffffff, 0.5);
  lights[0].position.set(1, 0, 0);
  lights[1] = new THREE.DirectionalLight(0xad5389, 0.5);
  lights[1].position.set(0.75, 1, 0.5);
  lights[2] = new THREE.DirectionalLight(0x3c1053, 0.5);
  lights[2].position.set(-0.75, -1, 0.5);
  scene.add(lights[0]);
  scene.add(lights[1]);
  scene.add(lights[2]);

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  var time = performance.now() * 0.001;

  var k = 2;
  for (var i = 0; i < sphere.geometry.vertices.length; i++) {
    var p = sphere.geometry.vertices[i];
    p.normalize().multiplyScalar(
      1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k, p.z * k)
    );
  }
  sphere.geometry.computeVertexNormals();
  sphere.geometry.normalsNeedUpdate = true;
  sphere.geometry.verticesNeedUpdate = true;
}

function animate() {
  update();
  requestAnimationFrame(animate);

  container.rotation.x -= 0.005;
  container.rotation.y += 0.004;
  renderer.clear();

  renderer.render(scene, camera);
}
