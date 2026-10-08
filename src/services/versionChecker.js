import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

// 1. Re-exportar versión actual y comparador desde utilidades compartidas
export { CURRENT_VERSION, isUpdateRequired } from '../utils/version';
import { CURRENT_VERSION, isUpdateRequired } from '../utils/version';

/**
 * Descarga y ejecuta el APK mostrando barra de progreso en SweetAlert2
 */
export async function downloadAndInstallApk(urlActualizacion) {
  if (!urlActualizacion) {
    await Swal.fire({
      title: 'Enlace no disponible',
      text: 'Se requiere una actualización obligatoria, pero el enlace de descarga aún no está configurado en el sistema.',
      icon: 'error',
      confirmButtonText: 'Entendido',
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'dark-swal',
        title: 'dark-swal-title',
        htmlContainer: 'dark-swal-content',
        confirmButton: 'primary-btn dark-swal-confirm',
      },
      buttonsStyling: false,
    });
    return;
  }

  // Modal de descarga con barra de progreso interactiva
  Swal.fire({
    title: 'Descargando actualización...',
    html: `
      <div style="margin-top: 14px; text-align: left;">
        <div style="background: rgba(148, 163, 184, 0.18); height: 12px; border-radius: 999px; overflow: hidden; position: relative;">
          <div id="swal-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(135deg, #7c3aed, #ec4899); border-radius: 999px; transition: width 0.15s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <p id="swal-progress-text" style="font-size: 13px; color: #94a3b8; font-weight: 500; margin: 0;">Iniciando descarga...</p>
          <span id="swal-progress-percent" style="font-size: 13px; color: #a78bfa; font-weight: 700; margin: 0;">0%</span>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: {
      popup: 'dark-swal',
      title: 'dark-swal-title',
      htmlContainer: 'dark-swal-content',
    },
    buttonsStyling: false,
  });

  try {
    const response = await fetch(urlActualizacion);
    if (!response.ok) {
      throw new Error(`Error en servidor (${response.status}: ${response.statusText})`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = response.body?.getReader();
    let receivedBytes = 0;
    const chunks = [];

    let lastPercent = -1;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;

        if (totalBytes > 0) {
          const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          if (percent !== lastPercent) {
            lastPercent = percent;
            const bar = document.getElementById('swal-progress-bar');
            const txt = document.getElementById('swal-progress-text');
            const pct = document.getElementById('swal-progress-percent');
            if (bar) bar.style.width = `${percent}%`;
            if (pct) pct.textContent = `${percent}%`;
            if (txt) {
              const mbReceived = (receivedBytes / (1024 * 1024)).toFixed(1);
              const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
              txt.textContent = `${mbReceived} MB de ${mbTotal} MB`;
            }
          }
        } else {
          const txt = document.getElementById('swal-progress-text');
          if (txt) {
            const mbReceived = (receivedBytes / (1024 * 1024)).toFixed(1);
            txt.textContent = `Descargados ${mbReceived} MB...`;
          }
        }
      }
    } else {
      const blobFallback = await response.blob();
      chunks.push(blobFallback);
    }

    // Modal indicando preparación del paquete
    const bar = document.getElementById('swal-progress-bar');
    const txt = document.getElementById('swal-progress-text');
    if (bar) bar.style.width = '100%';
    if (txt) txt.textContent = 'Preparando instalador...';

    const apkBlob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });

    // Si estamos en entorno nativo Capacitor (Android)
    if (Capacitor.isNativePlatform()) {
      // Convertir chunks/Blob a Base64
      const base64Data = await new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onloadend = () => {
          const resultStr = fileReader.result;
          if (typeof resultStr === 'string') {
            resolve(resultStr.split(',')[1]);
          } else {
            reject(new Error('No se pudo codificar el paquete en Base64'));
          }
        };
        fileReader.onerror = () => reject(new Error('Error al leer el archivo descargado'));
        fileReader.readAsDataURL(apkBlob);
      });

      // Guardar APK en el caché del dispositivo
      const fileName = 'update.apk';
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Obtener URI interna del archivo
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName,
      });

      // Abrir e iniciar instalador del paquete APK
      let opened = false;
      try {
        await FileOpener.open({
          filePath: fileUri.uri,
          contentType: 'application/vnd.android.package-archive',
          mimeType: 'application/vnd.android.package-archive',
          openWithDefault: true,
        });
        opened = true;
      } catch (firstErr) {
        console.warn('Fallo abriendo con URI directa, probando ruta absoluta:', firstErr);
        const cleanPath = fileUri.uri.replace(/^file:\/\//, '');
        await FileOpener.open({
          filePath: cleanPath,
          contentType: 'application/vnd.android.package-archive',
          mimeType: 'application/vnd.android.package-archive',
          openWithDefault: true,
        });
        opened = true;
      }

      if (opened) {
        Swal.fire({
          title: 'Instalando actualización',
          text: 'Se ha enviado la orden al instalador de Android. Si el sistema te solicita autorizar "Instalar aplicaciones desconocidas" para Project Nataly, actívalo en los ajustes de tu teléfono para continuar.',
          icon: 'info',
          confirmButtonText: 'Volver a abrir instalador',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'dark-swal',
            title: 'dark-swal-title',
            htmlContainer: 'dark-swal-content',
            confirmButton: 'primary-btn dark-swal-confirm',
          },
          buttonsStyling: false,
        }).then((res) => {
          if (res.isConfirmed) {
            FileOpener.open({
              filePath: fileUri.uri,
              contentType: 'application/vnd.android.package-archive',
              mimeType: 'application/vnd.android.package-archive',
              openWithDefault: true,
            }).catch(() => {
              const cleanPath = fileUri.uri.replace(/^file:\/\//, '');
              FileOpener.open({
                filePath: cleanPath,
                contentType: 'application/vnd.android.package-archive',
                mimeType: 'application/vnd.android.package-archive',
                openWithDefault: true,
              }).catch(console.error);
            });
          }
        });
      }
    } else {
      // Descarga normal para navegadores web durante desarrollo
      const downloadUrl = window.URL.createObjectURL(apkBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'update.apk';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      await Swal.fire({
        title: 'Descarga finalizada',
        text: 'Se ha descargado el paquete APK en tu navegador para pruebas.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content',
          confirmButton: 'primary-btn dark-swal-confirm',
        },
        buttonsStyling: false,
      });
    }
  } catch (err) {
    console.error('Error durante la actualización del APK:', err);
    const retry = await Swal.fire({
      title: 'Error de descarga',
      text: `No se pudo descargar la actualización: ${err.message || 'Error de conexión'}. ¿Deseas reintentar?`,
      icon: 'error',
      confirmButtonText: 'Reintentar',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCancelButton: false,
      customClass: {
        popup: 'dark-swal',
        title: 'dark-swal-title',
        htmlContainer: 'dark-swal-content',
        confirmButton: 'primary-btn dark-swal-confirm',
      },
      buttonsStyling: false,
    });

    if (retry.isConfirmed) {
      return downloadAndInstallApk(urlActualizacion);
    }
  }
}

/**
 * 3. Muestra el modal bloqueante de actualización obligatoria con SweetAlert2
 */
export async function showMandatoryUpdateModal(config) {
  const result = await Swal.fire({
    title: 'Nueva versión disponible',
    text: `Es obligatorio actualizar a la versión ${config.version_minima} para continuar utilizando Project Nataly.`,
    icon: 'warning',
    confirmButtonText: 'Actualizar ahora',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showCancelButton: false,
    customClass: {
      popup: 'dark-swal',
      title: 'dark-swal-title',
      htmlContainer: 'dark-swal-content',
      confirmButton: 'primary-btn dark-swal-confirm',
    },
    buttonsStyling: false,
  });

  if (result.isConfirmed) {
    await downloadAndInstallApk(config.url_actualizacion);
  } else {
    // Si por alguna razón se cierra, volver a mostrar
    showMandatoryUpdateModal(config);
  }
}

/**
 * Hook para implementar la actualización obligatoria in-app en componentes React
 */
export function useAppUpdate() {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!supabase) {
        if (isMounted) setIsChecking(false);
        return;
      }

      try {
        // Consulta a la tabla configuracion con .select('version_minima, url_actualizacion').single()
        const { data, error } = await supabase
          .from('configuracion')
          .select('version_minima, url_actualizacion')
          .single();

        if (error) {
          console.warn('No se pudo verificar la versión en Supabase:', error.message);
          return;
        }

        if (data?.version_minima && isUpdateRequired(data.version_minima, CURRENT_VERSION)) {
          if (isMounted) {
            setUpdateRequired(true);
            setConfig(data);
          }
          showMandatoryUpdateModal(data);
        }
      } catch (err) {
        console.error('Error al consultar configuracion en Supabase:', err);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    updateRequired,
    isChecking,
    config,
    triggerUpdate: () => config && downloadAndInstallApk(config.url_actualizacion),
  };
}

/**
 * Exportación para compatibilidad hacia atrás
 */
export async function checkAppVersion() {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('version_minima, url_actualizacion')
      .single();

    if (error || !data) return;

    if (data.version_minima && isUpdateRequired(data.version_minima, CURRENT_VERSION)) {
      showMandatoryUpdateModal(data);
    }
  } catch (err) {
    console.error('Error al comprobar versión:', err);
  }
}
