/**
 * MaxiProtocol - Módulo de Automatización y Extracción Asistida para Maxirest POS
 * Permite orquestar la obtención desatendida de los 3 informes oficiales:
 * 1. Formas de Cobro / Arqueo (bakinforme.dbf)
 * 2. Ventas por Concepto (CUB / Comensales reales y canales salón/mostrador/delivery)
 * 3. Ventas por Empleado (Mapeo verídico de mozos y productividad)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class MaxirestAutomation {
  constructor(config = {}) {
    this.posExe = config.posExe || 'C:\\MaxiREST_SQL\\MAXIREST.EXE';
    this.sqlDir = config.sqlDir || 'C:\\MaxiREST_SQL';
    this.dataDir = config.dataDir || 'C:\\MaxiRest';
    this.credentials = config.credentials || { user: '', password: '', dbPassword: '' };
  }

  setCredentials(creds) {
    if (creds.user !== undefined) this.credentials.user = String(creds.user).trim();
    if (creds.password !== undefined) this.credentials.password = String(creds.password).trim();
    if (creds.dbPassword !== undefined) this.credentials.dbPassword = String(creds.dbPassword).trim();
    return { success: true, hasUser: !!this.credentials.user, hasDbPass: !!this.credentials.dbPassword };
  }

  getStatus() {
    const isRunning = this.isProcessRunning();
    return {
      posExeExists: fs.existsSync(this.posExe),
      posRunning: isRunning,
      hasCredentials: !!(this.credentials.user && this.credentials.password),
      hasDbPassword: !!this.credentials.dbPassword,
      lastBakinforme: this.getLastBakinformeStat()
    };
  }

  isProcessRunning() {
    try {
      const out = execSync('tasklist /FI "IMAGENAME eq MAXIREST.EXE" /NH', { stdio: 'pipe' }).toString();
      return out.toLowerCase().includes('maxirest.exe');
    } catch (e) {
      return false;
    }
  }

  getLastBakinformeStat() {
    const fp = path.join(this.sqlDir, 'bakinforme.dbf');
    if (fs.existsSync(fp)) {
      const stat = fs.statSync(fp);
      return {
        exists: true,
        mtime: stat.mtime.toISOString(),
        size: stat.size
      };
    }
    return { exists: false };
  }
}

module.exports = MaxirestAutomation;
