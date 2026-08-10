// El enlace a la Escuela de LideresVIP debe llevar al Worker que conecta
// esta página con el backend (login, cursos, base de datos). Si esta
// página se está viendo de una forma que NO pasa por ese Worker —Live
// Server, doble clic al archivo, etc.— el enlace relativo "/LideresVIP/"
// no encontraría nada. En ese caso apuntamos directo al servidor de
// desarrollo local. En producción, donde todo vive en el mismo dominio,
// esta condición nunca se cumple y el enlace normal funciona tal cual.
(function () {
  var link = document.getElementById('vip-school-link');
  if (!link) return;

  var isLocalFile = location.protocol === 'file:';
  var isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var isWrongLocalPort = isLocalHost && location.port !== '8787';

  if (isLocalFile || isWrongLocalPort) {
    link.href = 'http://127.0.0.1:8787/LideresVIP/';
  }
})();
