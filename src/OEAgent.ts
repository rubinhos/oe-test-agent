import { exec, execSync } from 'child_process';
import { browser } from 'protractor';

import { Keys } from './Keys.enum';
import { OEAttributes } from './OEAttributes.enum';
import { OEButtons } from './OEButtons.enum';
import { OEConfig } from './OEConfig';
import { OEElement } from './OEElement';
import { OEEvents } from './OEEvents.enum';
import { OESocket } from './OESocket';
import { MessageType, OEUtils } from './OEUtils';

/**
 * Provides the interaction between the e2e Protractor tests and
 * Progress OpenEdge applications.
 */
export class OEAgent {
  private static ROBOTEXE = `${__dirname.replace(/\\/g, '/')}/robot/Robot.exe`;
  /**
   * Default TIMEOUT value for waiting events.
   */
  public static DEFAULT_TIMEOUT = 5_000;

  constructor(private oeSocket = new OESocket()) {}

  /**
   * Starts the agent application.
   *
   * @param config Configuration object.
   * @returns A promise result of the agent initialization and connection.
   */
  public start(config: OEConfig): Promise<boolean> {
    return browser.call(() => new Promise((resolve, reject) => {
      const cmd = this.buildCommandLine(config);
      const cwd = `${__dirname.replace(/\\/g, '/')}/abl/`;

      OEUtils.consoleLogMessage(`Executing OpenEdge with command line: ${cmd}`, MessageType.INFO);
      OEUtils.consoleLogMessage(`Current working directory: ${cwd}`, MessageType.INFO);

      const run = exec(cmd, { cwd: cwd });

      // Will use "race" to guess if Progress OE has been successfully opened.
      // This is not a 100% guarantee thing.
      const suc = new Promise(res => setTimeout(() => res({ status: true }), 10_000));
      const err = new Promise(res => run.on('error', (error: Error) => res({ status: false, error: error })));

      return Promise.race([suc, err]).then((result: any) => {
        return result['status'] ? this.connect(config.host, config.port).then(resolve) : reject(result['error']);
      });
    })) as Promise<boolean>;
  }

  /**
   * Connects to the agent server.
   *
   * @param host Agent server host name or IP address.
   * @param port Agent server port number.
   */
  public connect(host: string, port: number): Promise<boolean> {
    return browser.call(() => this.oeSocket.connect(host, port)) as Promise<boolean>;
  }

  /**
   * Returns the agent server connection status.
   * @returns ```true``` if the agent server is connected.
   */
  public connected(): boolean {
    return this.oeSocket.connected();
  }

  /**
   * Waits until an OE window with the informed title is found or a timeout
   * error is raised.
   *
   * @param title OE window title (full or partial).
   * @param timeout Waiting timeout.
   *
   * @returns Window ```OEElement``` instance.
   */
  public waitForWindow(title: string, timeout = OEAgent.DEFAULT_TIMEOUT): OEElement {
    const element = new OEElement(this);

    browser.wait(async () => {
      try {
        const id = await this.oeSocket.send(true, 'FINDWINDOW', title);
        element.id = parseInt(id);
        return true;
      } catch {
        await browser.sleep(700);
        return false;
      }
    }, timeout).catch(() => {} /* To avoid throwing an error */);

    return element;
  }

  /**
   * Searches for an OE window with the informed title.
   *
   * @param title OE window title (full or partial).
   * @returns Window ```OEElement``` instance.
   */
  public findWindow(title: string): OEElement {
    const element: OEElement = new OEElement(this);

    browser.call(() => {
      return this.oeSocket.send(true, 'FINDWINDOW', title).then((id: string) => (element.id = parseInt(id)));
    });

    return element;
  }

  /**
   * Wait until an OE widget is found with the informed name attribute or a
   * timeout error is raised.
   *
   * @param name Widget ```NAME``` attribute.
   * @param visible ```true``` to only search visible elements.
   * @param timeout Waiting timeout.
   * @param parent Parent ```OEElement``` instance, if informed the agent
   * will consider a search only by its children.
   *
   * @returns Widget ```OEElement``` instance.
   */
  public waitForElement(name: string, visible = true, timeout = OEAgent.DEFAULT_TIMEOUT, parent?: OEElement): OEElement {
    const element = new OEElement(this);

    browser.wait(async () => {
      try {
        const id = await this.oeSocket.send(true, 'FINDELEMENT', name, visible, parent ? parent.id : '');
        element.id = parseInt(id);
        return true;
      } catch {
        await browser.sleep(700);
        return false;
      }
    }, timeout).catch(() => {} /* To avoid throwing an error */);

    return element;
  }

  /**
   * Searches for an OE widget with the informed name attribute.
   *
   * @param name Widget ```NAME``` attribute.
   * @param visible ```true``` to only search visible elements.
   * @param parent Parent ```OEElement``` instance, if informed the agent
   * will consider a search only by its children.
   *
   * @returns Widget ```OEElement``` instance.
   */
  public findElement(name: string, visible = true, parent?: OEElement): OEElement {
    const element = new OEElement(this);

    browser.call(() => {
      return this.oeSocket
        .send(true, 'FINDELEMENT', name, visible, parent ? parent.id : '')
        .then((id: string) => (element.id = parseInt(id)));
    });

    return element;
  }

  /**
   * Search for an OE widget with the value of the informed attribute.
   *
   * @param attr Attribute name.
   * @param value Attribute value.
   * @param visible ```true``` to only search visible elements.
   * @param parent Parent ```OEElement``` instance, if informed the agent
   * will consider a search only by its children.
   *
   * @returns Widget ```OEElement``` instance.
   */
  public findElementByAttribute(attribute: OEAttributes, value: string, visible = true, parent?: OEElement): OEElement {
    const element = new OEElement(this);

    browser.call(() => {
      return this.oeSocket
        .send(true, 'FINDELEMENTBYATTRIBUTE', attribute, value, visible, parent ? parent.id : '')
        .then((id: string) => (element.id = parseInt(id)));
    });

    return element;
  }

  /**
   * Returns if the widget ```OEElement``` is valid.

   * @param element Widget ```OEElement``` instance.
   * @returns A promise result of the command.
   */
  public isElementValid(element: OEElement): Promise<boolean> {
    return browser.call(() => element.id && element.id > 0) as Promise<boolean>;
  }

  /**
   * Clears the widget ```SCREEN-VALUE```.
   *
   * @param element Widget ```OEElement``` instance.
   * @returns A promise result of the command.
   */
  public clear(element: OEElement): Promise<boolean> {
    return browser.call(() => this.oeSocket.send(true, 'CLEAR', element.id).then(() => true)) as Promise<boolean>;
  }

  /**
   * Changes the widget ```SCREEN-VALUE```.
   *
   * @param value Widget's new ```SCREEN-VALUE```.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public sendKeys(value: string | number, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'SENDKEYS', element.id, value).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Checks/Unchecks a TOGGLE-BOX widget.
   *
   * @param check ```true``` to check the widget.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public check(check: boolean, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'CHECK', element.id, check).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Selects a value in a COMBO-BOX or RADIO-SET widget.
   *
   * @param value Selection value.
   * @param partial ```true``` if it's a partial value.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public select(value: string | number, partial = false, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'SELECT', element.id, value, partial).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Selects a row in a BROWSE widget.
   *
   * @param row Row number.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public selectRow(row: number, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'SELECTROW', element.id, row).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Moves a QUERY result pointer of a BROWSE widget to the specified row.
   *
   * @param row Row number.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public repositionToRow(row: number, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'REPOSITIONTOROW', element.id, row).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Applies a ```CHOOSE``` event to the widget.
   *
   * @param element Widget ```OEElement``` instance.
   * @returns A promise result of the command.
   */
  public choose(element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(false, 'CHOOSE', element.id).then(() => browser.sleep(1000)).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Applies an event to the widget.
   *
   * @param event Event name.
   * @param element Widget ```OEElement``` instance.
   * @param wait ```true``` to wait the ```APPLY``` event.
   *
   * @returns A promise result of the command.
   */
  public apply(event: OEEvents | string, element: OEElement, wait = false): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(wait, 'APPLY', element.id, event).then(() => browser.sleep(1_000)).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Gets the widget's informed attribute value.
   *
   * @param attr Attribute name.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result data of the command.
   */
  public get(attr: OEAttributes | string, element: OEElement): Promise<string> {
    return browser.call(() => this.oeSocket.send(true, 'GET', element.id, attr)) as Promise<string>;
  }

  /**
   * Sets the widget's informed attribute value.
   *
   * @param attr Attribute name.
   * @param value Attribute value.
   * @param element Widget ```OEElement``` instance.
   *
   * @returns A promise result of the command.
   */
  public set(attr: OEAttributes | string, value: string, element: OEElement): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'SET', element.id, attr, value).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Selects one or more records of the informed table.
   *
   * @param table Table name.
   * @param where Query's WHERE clause.
   *
   * @returns A promise result data of the command.
   *
   * @example
   * ```typescript
   * const oe = new OEAgent();
   * let data: Object;
   *
   * oe.query("Department", "WHERE DeptCode = 'PRC'").then((result) => data = result);
   *
   * // The result of data will be:
   * // {
   * //   "Department": [{
   * //     "DeptCode": "PRC",
   * //     "DeptName": "Purchasing"
   * //   }]
   * // };
   * ```
   */
  public query(table: string, where: string): Promise<Object> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'QUERY', table, where).then(result => JSON.parse(result));
    }) as Promise<boolean>;
  }

  /**
   * Creates one or more records in the informed table.
   *
   * @param table Table name.
   * @param data TEMP-TABLE "like" JSON with the records.
   *
   * @returns A promise result of the command.
   *
   * @example
   * ```typescript
   * const oe = new OEAgent();
   * const data = {
   *   "Department": [{
   *     "DeptCode": "PRC",
   *     "DeptName": "Purchasing"
   *   },{
   *     "DeptCode": "HRM",
   *     "DeptName": "HR Management"
   *   }]
   * };
   *
   * oe.create("Department", data);
   * ```
   */
  public create(table: string, data: Object): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'CREATE', table, JSON.stringify(data)).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Updates one or more records of the informed table.
   *
   * @param table Table name.
   * @param data TEMP-TABLE "like" JSON with the records.
   * @param index Table index columns.
   *
   * @returns A promise result of the command.
   *
   * @example
   * ```typescript
   * const oe = new OEAgent();
   * const data = {
   *   "Department": [{
   *     "DeptCode": "PRC",
   *     "DeptName": "Purchasing Dept."
   *   },{
   *     "DeptCode": "HRM",
   *     "DeptName": "HR Managm. Dept."
   *   }]
   * };
   *
   * oe.update("Department", data, ["DeptCode"]);
   * ```
   */
  public update(table: string, data: Object, index: string[]): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'UPDATE', table, JSON.stringify(data), JSON.stringify(index)).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Deletes one or more records of the informed table.
   *
   * @param table Table name.
   * @param where Optional delete's WHERE clause.
   *
   * @returns A promise result of the command.
   *
   * @obs If no "where" was informed, all the records of the informed table
   * will be deleted.
   *
   * @example
   * ```typescript
   *
   * oe.delete('Department', 'DeptCode = "123"');
   * oe.delete("Department");
   * ```
   */
  public delete(table: string, where = '1=1'): Promise<boolean> {
    return browser.call(() => {
      return this.oeSocket.send(true, 'DELETE', table, where).then(() => true);
    }) as Promise<boolean>;
  }

  /**
   * Runs a ```PROCEDURE``` command or open an OE application.
   *
   * @param run OE application path (full or partial according to PROPATH).
   * @param params Application input parameters.
   *
   * @returns A promise result of the command.
   */
  public run(run: string, params: string[] = []): Promise<boolean> {
    return browser
      .call(() => this.oeSocket.send(false, 'RUN', run, params).then(() => browser.sleep(1000)))
      .then(() => true) as Promise<boolean>;
  }

  /**
   * Quits the agent application.
   * This will close all comunication with the agent server.
   *
   * @returns A promise result of the command.
   */
  public quit(): Promise<boolean> {
    return browser
      .call(() => this.oeSocket.send(false, `QUIT`).then(() => browser.sleep(2000)))
      .then(() => true) as Promise<boolean>;
  }

  /**
   * Tests if an application exists with the informed title.
   * OBS: this uses Robot and will consider all opened applications in the OS.
   *
   * @param title Window title.
   * @param timeout Waiting timeout.
   *
   * @returns A promise result of the command.
   */
  public windowExists(title: string, timeout = OEAgent.DEFAULT_TIMEOUT): Promise<boolean> {
    return browser.call(() => new Promise(resolve => {
      let winExists = true;

      OEUtils.consoleLogMessage(`(Robot) Searching "${title}" window`, MessageType.INFO);

      try {
        execSync(`"${OEAgent.ROBOTEXE}" -t ${timeout} -w "${title}"`);
      } catch (error) {
        winExists = false;
      }

      resolve(winExists);
    })) as Promise<boolean>;
  }

  /**
   * Sends keyboard events to an application with the informed title.
   * OBS: this uses Robot and will consider all opened applications in the OS.
   *
   * @param title Window title.
   * @param keys Keyboard events.
   * @param timeout Waiting timeout.
   *
   * @returns A promise result of the command.
   */
  public windowSendKeys(title: string, keys: KeyEvents, timeout = OEAgent.DEFAULT_TIMEOUT): Promise<boolean> {
    return browser.call(() => new Promise((resolve, reject) => {
      let allKeys: string;

      if (Array.isArray(keys)) {
        allKeys = keys.join('');
      } else {
        allKeys = keys;
      }

      OEUtils.consoleLogMessage(`(Robot) Sending keyboard events "${allKeys}" to "${title}" window`, MessageType.INFO);

      try {
        execSync(`"${OEAgent.ROBOTEXE}" -t ${timeout} -w "${title}" -k "${allKeys}"`);
        resolve(true);
      } catch (error) {
        reject(error.stderr);
      }
    })) as Promise<boolean>;
  }

  /**
   * Sends an "OK" click in an OE alert-box error message.
   * @returns A promise result of the command.
   */
  public alertErrorOK(): Promise<boolean> {
    return this.alertClick('Erro|Error', OEButtons.OK);
  }

  /**
   * Send an "OK" click in an OE alert-box warning message.
   * @returns A promise result of the command.
   */
  public alertWarningOK(): Promise<boolean> {
    return this.alertClick('Aviso|Warning', OEButtons.OK);
  }

  /**
   * Send an "OK" click in an OE alert-box info message.
   * @returns A promise result of the command.
   */
  public alertInfoOK(): Promise<boolean> {
    return this.alertClick('Informação|Information', OEButtons.OK);
  }

  /**
   * Send a "YES" click in an OE alert-box question message.
   * @returns A promise result of the command.
   */
  public alertQuestionYes(): Promise<boolean> {
    return this.alertClick('Pergunta|Question', OEButtons.YES);
  }

  /**
   * Send a "NO" click in an OE alert-box question message.
   * @returns A promise result of the command.
   */
  public alertQuestionNo(): Promise<boolean> {
    return this.alertClick('Pergunta|Question', OEButtons.NO);
  }

  /**
   * Sends a click to an OE alert-box message.
   *
   * @param title Alert-box message title.
   * @param button Button type.
   * @param timeout Waiting timeout.
   *
   * @returns A promise result of the command.
   */
  public alertClick(title: string, button: OEButtons, timeout = OEAgent.DEFAULT_TIMEOUT): Promise<boolean> {
    return browser.call(() => new Promise((resolve, reject) => {
      OEUtils.consoleLogMessage(`(Robot) Sending "${button}" click to "${title}" alert-box message`, MessageType.INFO);

      try {
        execSync(`"${OEAgent.ROBOTEXE}" -t ${timeout} -w "${title}" -b "${button}"`);
        resolve(true);
      } catch (error) {
        reject(error.stderr);
      }
    })) as Promise<boolean>;
  }

  /**
   * Takes a screenshot of each window from the informed process.
   *
   * @param pathname Absolute pathname of the screenshot file.
   * @param process Process name.
   * @param exclusions List of windows titles that will be excluded.
   * @param timeout Waiting timeout.
   *
   * @returns A promise result with a list of the images filenames.
   */
  public takeScreenshotFromProcess(pathname: string, process = 'prowin32.exe', exclusions: string[] = [], timeout = OEAgent.DEFAULT_TIMEOUT): Promise<string[]> {
    return browser.call(() => new Promise((resolve, reject) => {
      OEUtils.consoleLogMessage(`(Robot) Taking screenshot of the process "${process}" and saving in "${pathname}"`, MessageType.INFO);

      try {
        const buffer = execSync(`"${OEAgent.ROBOTEXE}" -s "${pathname}" -p "${process}" -e "${exclusions.join('|')}"`);
        resolve(buffer.toString().split('|'));
      } catch (error) {
        reject(error.stderr);
      }
    })) as Promise<string[]>;
  }

  /**
   * Takes a screenshot of the window with the informed title.
   *
   * @param pathname Absolute pathname of the screenshot file.
   * @param title Window title.
   * @param timeout Waiting timeout.
   *
   * @returns A promise result with the image filename.
   */
  public takeScreenshot(pathname: string, title: string, timeout = OEAgent.DEFAULT_TIMEOUT): Promise<string> {
    return browser.call(() => new Promise((resolve, reject) => {
      OEUtils.consoleLogMessage(`(Robot) Taking screenshot of the window "${title}" and saving in "${pathname}"`, MessageType.INFO);

      try {
        const buffer = execSync(`"${OEAgent.ROBOTEXE}" -s "${pathname}" -w "${title}"`);
        resolve(buffer.toString());
      } catch (error) {
        reject(error.stderr);
      }
    })) as Promise<string>;
  }

  /**
   * Sets a new default timeout value.
   * @param timeout New default timeout value (in milliseconds).
   */
  public setDefaultTimeout(timeout: number): void {
    OEAgent.DEFAULT_TIMEOUT = timeout;
  }

  /**
   * Restores the timeout value to the `OEAgent` default value (5000 ms).
   */
  public restoreDefaultTimeout(): void {
    OEAgent.DEFAULT_TIMEOUT = 5_000;
  }

  /**
   * Build the command line to start the agent application.
   *
   * @param config Configuration object.
   * @returns Built command line.
   */
  private buildCommandLine(config: OEConfig): string {
    let prm = '';
    let cmd = '';

    // Load the session parameters.
    prm += `${config.host},`;
    prm += `${config.port},`;
    prm += `${config.outDir},`;
    prm += `${(config.propath || []).join('|')},`;
    prm += `${config.startupFile},`;
    prm += `${(config.startupFileParams || []).join('|')},`;
    prm += `${config.inputCodepage || 'UTF-8'}`;

    // Load the command line.
    cmd += `"${config.dlcHome}/bin/prowin32.exe"`;
    cmd += ` -p "${__dirname.replace(/\\/g, '/')}/abl/OEStart.p"`;
    cmd += ` -param "${prm}"`;

    if (config.parameterFile) {
      cmd += ` -pf "${config.parameterFile}"`;
    }

    if (config.iniFile) {
      cmd += ` -basekey ini -ininame "${config.iniFile}"`;
    }

    return cmd;
  }
}

/**
 * ```OEAgent``` singleton instance.
 */
export const oeAgent = new OEAgent();

// KeyEvents type.
type KeyEvents = Keys | Keys[] | string;
