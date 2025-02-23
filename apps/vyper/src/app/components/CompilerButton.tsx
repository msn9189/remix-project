import React, { Fragment, useState } from 'react'
import {isVyper, compile, toStandardOutput, isCompilationError, remixClient, normalizeContractPath} from '../utils'
import Button from 'react-bootstrap/Button'
import _ from 'lodash'

interface Props {
  compilerUrl: string
  contract?: string
  setOutput: (name: string, output: any) => void
  resetCompilerState: () => void
}

function CompilerButton({contract, setOutput, compilerUrl, resetCompilerState}: Props) {
  const [loadingSpinner, setLoadingSpinnerState] = useState(false)
  if (!contract || !contract) {
    return <Button disabled className="w-100">No contract selected</Button>
  }

  if (!isVyper(contract)) {
    return <Button disabled className="w-100">Not a vyper contract</Button>
  }

  /** Compile a Contract */
  async function compileContract() {
    resetCompilerState()
    setLoadingSpinnerState(true)
    try {
      // await remixClient.discardHighlight()
      let _contract: any
      try {
        _contract = await remixClient.getContract()
      } catch (e: any) {
        setOutput('', {status: 'failed', message: e.message})
        return
      }
      remixClient.changeStatus({
        key: 'loading',
        type: 'info',
        title: 'Compiling'
      })
      let output
      try {
        output = await compile(compilerUrl, _contract)
      } catch (e: any) {
        remixClient.changeStatus({
          key: 'failed',
          type: 'error',
          title: e.message
        })
        return
      }
      const compileReturnType = () => {
        const t: any = toStandardOutput(contract, output)
        const temp = _.merge(t['contracts'][contract])
        const normal = normalizeContractPath(contract)[2]
        const abi = temp[normal]['abi']
        const evm = _.merge(temp[normal]['evm'])
        const dpb = evm.deployedBytecode
        const runtimeBytecode = evm.bytecode
        const methodIdentifiers = evm.methodIdentifiers

        const result = {
          contractName: normal,
          abi: abi,
          bytecode: dpb,
          runtimeBytecode: runtimeBytecode,
          ir: '',
          methodIdentifiers: methodIdentifiers
        }
        return result
      }

      // ERROR
      if (isCompilationError(output)) {
        const line = output.line
        if (line) {
          const lineColumnPos = {
            start: {line: line - 1, column: 10},
            end: {line: line - 1, column: 10}
          }
          // remixClient.highlight(lineColumnPos as any, _contract.name, '#e0b4b4')
        } else {
          const regex = output?.message?.match(/line ((\d+):(\d+))+/g)
          const errors = output?.message?.split(/line ((\d+):(\d+))+/g) // extract error message
          if (regex) {
            let errorIndex = 0
            regex.map((errorLocation) => {
              const location = errorLocation?.replace('line ', '').split(':')
              let message = errors[errorIndex]
              errorIndex = errorIndex + 4
              if (message && message?.split('\n\n').length > 0) {
                try {
                  message = message?.split('\n\n')[message.split('\n\n').length - 1]
                } catch (e) {}
              }
              if (location?.length > 0) {
                const lineColumnPos = {
                  start: {line: parseInt(location[0]) - 1, column: 10},
                  end: {line: parseInt(location[0]) - 1, column: 10}
                }
                // remixClient.highlight(lineColumnPos as any, _contract.name, message)
              }
            })
          }
        }
        throw new Error(output.message)
      }
      // SUCCESS
      // remixClient.discardHighlight()
      remixClient.changeStatus({
        key: 'succeed',
        type: 'success',
        title: 'success'
      })
      const data = toStandardOutput(_contract.name, output)
      remixClient.compilationFinish(_contract.name, _contract.content, data)
      setOutput(_contract.name, compileReturnType())
    } catch (err: any) {
      remixClient.changeStatus({
        key: 'failed',
        type: 'error',
        title: err.message
      })
    }
  }

  return (
    <Fragment>
      <button data-id="compile" onClick={compileContract} title={contract} className="btn btn-primary w-100 d-block btn-block text-break remixui_disabled mb-1 mt-3">
        <div className="d-flex align-items-center justify-content-center fa-1x">
          <span className="fas fa-sync fa-pulse mr-1" />
          <div className="text-truncate overflow-hidden text-nowrap">
            <span>Compile</span>
            <span className="ml-1 text-nowrap">{contract}</span>
          </div>
        </div>
      </button>
    </Fragment>
  )
}

export default CompilerButton
