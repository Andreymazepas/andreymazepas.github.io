var renderer, scene, camera, composer, sphere, backgroundbox, particle;

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

  /*camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );*/
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);

  camera.position.set(0, 0, 25);
  camera.position.z = 40;
  scene.add(camera);

  sphere = new THREE.Object3D();
  backgroundbox = new THREE.Object3D();
  particle = new THREE.Object3D();

  scene.add(sphere);
  scene.add(backgroundbox);
  //scene.add(particle);

  var geometry = new THREE.TetrahedronGeometry(2, 0);
  var geom = new THREE.IcosahedronGeometry(7, 1);
  var geom2 = new THREE.BoxGeometry(15, 15, 15, 1, 1, 1);
  //setGeom(new THREE.BoxGeometry(15, 15, 15), 0x000000, 10, 0, 0);
  //setGeom(new THREE.PlaneBufferGeometry(5, 5, 11, 12), 0x00ffff, -10, 0, 0);

  var mat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shading: THREE.FlatShading,
  });

  var texture = new THREE.TextureLoader().load('images/grid.webp');

  var sphere_geometry = new THREE.SphereGeometry(1, 128, 128);
  var material = new THREE.MeshNormalMaterial();
  sphere_mesh = new THREE.Mesh(sphere_geometry, material);
  sphere_mesh.scale.x = sphere.scale.y = sphere.scale.z = 5;
  sphere.add(sphere_mesh);

  var mat2 = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    wireframe: true,
    side: THREE.DoubleSide,
  });
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });

  var boxMesh = new THREE.Mesh(geom2, material);
  boxMesh.doubleSided = true;
  boxMesh.scale.x = boxMesh.scale.y = boxMesh.scale.z = 15;
  backgroundbox.add(boxMesh);

  var ambientLight = new THREE.AmbientLight(0x999999);
  scene.add(ambientLight);

  var lights = [];
  lights[0] = new THREE.DirectionalLight(0xffffff, 1);
  lights[0].position.set(1, 0, 0);
  lights[1] = new THREE.DirectionalLight(0x11e8bb, 1);
  lights[1].position.set(0.75, 1, 0.5);
  lights[2] = new THREE.DirectionalLight(0x8200c9, 1);
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
  for (var i = 0; i < sphere.geometry.vertices.length; i++) {
    var p = sphere.geometry.vertices[i];
  }
  sphere.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
}

function animate() {
  requestAnimationFrame(animate);

  particle.rotation.x += 0.0;
  particle.rotation.y -= 0.004;
  backgroundbox.rotation.x -= 0.0005;
  backgroundbox.rotation.y += 0.0004;
  sphere.rotation.x += 0.004;
  sphere.rotation.y -= 0.01;
  renderer.clear();

  renderer.render(scene, camera);
}

function setGeom(g, color, x, y, z) {
  ToQuads(g);
  let m = new THREE.LineBasicMaterial({
    color: color,
  });
  var material = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    shading: THREE.FlatShading,
  });
  let o = new THREE.LineSegments(g, m);
  o.position.set(x, y, z);
  scene.add(o);
}

function ToQuads(g) {
  let p = g.parameters;
  let segmentsX =
    (g.type == 'TorusGeometry' ? p.tubularSegments : p.radialSegments) ||
    p.widthSegments ||
    p.thetaSegments ||
    p.points.length - 1 ||
    1;
  let segmentsY =
    (g.type == 'TorusGeometry' ? p.radialSegments : p.tubularSegments) ||
    p.heightSegments ||
    p.phiSegments ||
    p.segments ||
    1;
  let indices = [];
  for (let i = 0; i < segmentsY + 1; i++) {
    let index11 = 0;
    let index12 = 0;
    for (let j = 0; j < segmentsX; j++) {
      index11 = (segmentsX + 1) * i + j;
      index12 = index11 + 1;
      let index21 = index11;
      let index22 = index11 + (segmentsX + 1);
      indices.push(index11, index12);
      if (index22 < (segmentsX + 1) * (segmentsY + 1) - 1) {
        indices.push(index21, index22);
      }
    }
    if (index12 + segmentsX + 1 <= (segmentsX + 1) * (segmentsY + 1) - 1) {
      indices.push(index12, index12 + segmentsX + 1);
    }
  }
  g.setIndex(indices);
}
