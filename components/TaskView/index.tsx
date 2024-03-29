/* eslint-disable dot-notation */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
'use client'
// import { useState } from 'react'
import { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { UserOutlined } from '@ant-design/icons'
import TransactionList from '../TaskTransactionsList'
import { ethers } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'
import DOMPurify from 'dompurify'
import ReactHtmlParser, { convertNodeToElement } from 'react-html-parser'

import {
  readContract,
  writeContract,
  prepareWriteContract,
  waitForTransaction,
} from '@wagmi/core'
import taskContractABI from '@/utils/abi/taskContractABI.json'
import erc20ContractABI from '@/utils/abi/erc20ContractABI.json'
import axios from 'axios'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { IPFSSubmition, TasksOverview, Event } from '@/types/task'
import HeroTask from './HeroTask'
import UpdatesList from './UpdatesList'
import ApplicantsSubmissionsList from './ApplicantsSubmissionsList'

const TaskView = (id: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [events, setEvents] = useState<Event[]>([])
  const [imgTaskIPFS, setImgTaskIPFS] = useState('')
  const [viewOption, setViewOption] = useState('projectDescription')
  const [taskMetadata, setTaskMetadata] = useState<TasksOverview>()
  const [contributorsAllowed, setContributorsAllowed] = useState([])

  const { push } = useRouter()
  const { address } = useAccount()

  const taskStateCircle = {
    open: 'circle-green-task.svg',
    taken: 'circle-yellow-task.svg',
    closed: 'circle-gray-task.svg',
  }

  const taskState = [
    { state: 'Open', img: 'circle-green-task.svg' },
    { state: 'Taken', img: 'circle-yellow-task.svg' },
    { state: 'Closed', img: 'circle-gray-task.svg' },
  ]

  const searchParams = useSearchParams()
  const applsub = searchParams.get('applsub')

  async function getTask(id: any) {
    const dataBody = {
      id,
    }
    setIsLoading(true)
    const config = {
      method: 'post' as 'post',
      url: `${process.env.NEXT_PUBLIC_API_BACKEND_BASE_URL}/functions/getTask`,
      headers: {
        'x-parse-application-id': `${process.env.NEXT_PUBLIC_API_BACKEND_KEY}`,
      },
      data: dataBody,
    }

    try {
      await axios(config).then(function (response) {
        if (response.data) {
          setTaskMetadata(response.data)
          if (response.data['Application']) {
            const contributors = response.data['Application']
              .filter((app) => app.taken === true)
              .map((app) => app.applicant)
            setContributorsAllowed(contributors)
          }
        }
      })
    } catch (err) {
      toast.error('Task undefined!')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      push(
        `${process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD' ? `/openrd` : `/`}`,
      )
      console.log(err)
    }

    setIsLoading(false)
  }

  function formatDeadlineComplet(timestamp) {
    const dateInMilliseconds = parseInt(timestamp, 10) * 1000 // converta para milissegundos
    const formattedDeadline = format(
      new Date(dateInMilliseconds),
      "HH:mm:ss 'UTC', dd MMMM yyyy",
    )
    return formattedDeadline
  }

  async function handleEvents(id: string) {
    const dataBody = {
      id,
    }
    const config = {
      method: 'post' as 'post',
      url: `${process.env.NEXT_PUBLIC_API_BACKEND_BASE_URL}/functions/getTaskEvents`,
      headers: {
        'x-parse-application-id': `${process.env.NEXT_PUBLIC_API_BACKEND_KEY}`,
      },
      data: dataBody,
    }

    try {
      await axios(config).then(function (response) {
        if (response.data) {
          setEvents(response.data.sort((a, b) => b.timestamp - a.timestamp))
        }
      })
    } catch (err) {
      toast.error('Error getting the updates!')
      console.log(err)
    }
  }

  function returnContributors() {
    if (!contributorsAllowed || contributorsAllowed.length === 0) {
      return <div className="mt-[20px]">Empty</div>
    } else {
      return (
        <div>
          {contributorsAllowed.map((contributor, index) => (
            <div
              className="mt-[20px] flex items-center text-[12px] font-medium lg:text-[16px]"
              key={index}
            >
              <img
                alt="ethereum avatar"
                src={`https://effigy.im/a/${contributor}.svg`}
                className=" mr-[20px] w-[30px] rounded-full"
              ></img>
              <a
                title={contributor}
                className="hover:text-primary"
                href={`${
                  process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                    ? `/openrd/profile/${contributor}`
                    : `/profile/${contributor}`
                }`}
              >
                {formatAddress(contributor)}
              </a>
            </div>
          ))}
        </div>
      )
    }
  }

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
    if (id) {
      setIsLoading(true)
      // console.log('search for the task info on blockchain')
      // console.log(id.id)
      getTask(id.id)
      handleEvents(id.id)
    }
  }, [id])
  function formatAddress(address) {
    return `${address?.slice(0, 6)}...${address?.slice(-4)}`
  }

  function transform(node, index) {
    if (node.type === 'tag') {
      switch (node.name) {
        case 'h1':
          node.attribs.style = 'font-size: 2rem; font-weight: bold;'
          break
        case 'h2':
          node.attribs.style = 'font-size: 1.5rem; font-weight: bold;'
          break
        case 'ul':
          node.attribs.style = 'list-style: disc; margin-left: 40px;' // Ajuste o valor conforme necessário
          break
        case 'ol':
          node.attribs.style = 'list-style: decimal; margin-left: 40px;' // Ajuste o valor conforme necessário
          break
        case 'strong':
        case 'b':
          node.attribs.style = 'font-weight: bold;'
          break
        case 'em':
        case 'i':
          node.attribs.style = 'font-style: italic;'
          break
        case 'li':
          if (
            node.attribs.class &&
            node.attribs.class.includes('ql-indent-1')
          ) {
            node.attribs.style = 'margin-left: 30px;' // Adicione mais estilos se a classe ql-indent-1 tiver especificidades
          }
          break
        // Adicione mais casos conforme necessário
      }
    }
    return convertNodeToElement(node, index, transform)
  }

  useEffect(() => {
    if (applsub === 'true') {
      setViewOption('submissions')
      // console.log('sim senhorio meu')
      // Faça algo quando isOpenrd for true
    }
  }, [applsub])

  if (isLoading || !taskMetadata) {
    return (
      <section className="py-16 px-[20px] text-black md:py-20 lg:px-[100px] lg:pt-40">
        <div className="container flex h-60 animate-pulse px-0 pb-12">
          <div className="mr-10 w-3/4 animate-pulse bg-[#dfdfdf]"></div>
          <div className="w-1/4 animate-pulse bg-[#dfdfdf]"></div>
        </div>
        <div className="container h-96 animate-pulse bg-[#dfdfdf] pb-12"></div>
      </section>
    )
  }

  return (
    <>
      <HeroTask
        task={taskMetadata}
        contributorsAllowed={contributorsAllowed}
        address={address}
      />
      <section className="px-[20px] pt-[15px] pb-[80px] lg:px-[100px] lg:pb-[250px] lg:pt-[59px]">
        <div className="container mt-12  px-[0px] text-[12px] font-medium !leading-[19px] text-[#000000] lg:text-[16px]">
          <div className="flex flex-wrap items-start">
            <div className="w-full">
              {taskMetadata.metadataEdited && (
                <div className="-mt-[60px] mb-[40px] flex w-full rounded-[10px] bg-[#FFF6E0] py-[30px] px-[63px]">
                  <div className="mr-[25px] mb-0 flex w-[35px] flex-none items-center">
                    <img
                      alt="warning"
                      src={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? process.env.NEXT_PUBLIC_BASE_PATH
                          : ''
                      }/images/task/warning.svg`}
                      className=""
                    ></img>
                  </div>
                  <div className="!leading-[150%]">
                    The task's metadata seems to have changed. We recommend
                    reaching out to the{' '}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? `/openrd/profile/${taskMetadata.executor}`
                          : `/profile/${taskMetadata.executor}`
                      }`}
                      className="mr-1 border-b border-[#0354EC] pl-1 text-[#0354EC]"
                    >
                      project creator{' '}
                    </a>{' '}
                    to know more about it.
                  </div>
                </div>
              )}
              {taskMetadata.hasSpamLink && (
                <div className="-mt-[60px] mb-[40px] flex w-full rounded-[10px] bg-[#FFF6E0] py-[30px] px-[63px]">
                  <div className="mr-[25px] mb-0 flex w-[35px] flex-none items-center">
                    <img
                      alt="warning"
                      src={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? process.env.NEXT_PUBLIC_BASE_PATH
                          : ''
                      }/images/task/warning.svg`}
                      className=""
                    ></img>
                  </div>
                  <div className="!leading-[150%]">
                    We've detected that this task might be related to spam
                    activities. We recommend reaching out to a{' '}
                    <a
                      href={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? `/openrd/profile/${taskMetadata.executor}`
                          : `/profile/${taskMetadata.executor}`
                      }`}
                      className="mr-1 border-b border-[#0354EC] pl-1 text-[#0354EC]"
                    >
                      verified contributor{' '}
                    </a>{' '}
                    for more information.
                  </div>
                </div>
              )}
              {!taskMetadata.title && (
                <div className="-mt-[60px] mb-[40px] flex w-full rounded-[10px] bg-[#FFF6E0] py-[30px] px-[63px]">
                  <div className="mr-[25px] mb-0 flex w-[35px] flex-none items-center">
                    <img
                      alt="warning"
                      src={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? process.env.NEXT_PUBLIC_BASE_PATH
                          : ''
                      }/images/task/warning.svg`}
                      className=""
                    ></img>
                  </div>
                  <div className="!leading-[150%]">
                    The task's metadata seems to be empty. We recommend reaching
                    out to the{' '}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${
                        process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                          ? `/openrd/profile/${taskMetadata.executor}`
                          : `/profile/${taskMetadata.executor}`
                      }`}
                      className="mr-1 border-b border-[#0354EC] pl-1 text-[#0354EC]"
                    >
                      project creator{' '}
                    </a>{' '}
                    for more information.
                  </div>
                </div>
              )}
              <div className="flex overflow-x-auto font-bold !leading-[150%]">
                <div
                  className={`px-[17px] pb-[14px] text-center ${
                    viewOption === 'projectDescription'
                      ? 'border-b-[2px] border-[#000000]'
                      : ''
                  }`}
                >
                  <p
                    onClick={() => {
                      setViewOption('projectDescription')
                    }}
                    className="cursor-pointer   hover:text-[#353535]"
                  >
                    Project description
                  </p>
                </div>
                <div
                  className={`mx-[17px] px-[17px] pb-[14px] text-center lg:mx-[57px] ${
                    viewOption === 'submissions'
                      ? 'border-b-[2px]  border-[#000000]'
                      : ''
                  }`}
                >
                  <p
                    onClick={() => {
                      setViewOption('submissions')
                    }}
                    className="cursor-pointer hover:text-[#353535]"
                  >
                    Applicants & submissions
                  </p>
                </div>
                <div
                  className={`px-[17px]  pb-[14px] ${
                    viewOption === 'updates'
                      ? 'border-b-[2px]  border-[#000000]'
                      : ''
                  }`}
                >
                  <p
                    onClick={() => {
                      setViewOption('updates')
                    }}
                    className="cursor-pointer text-center hover:text-[#353535]"
                  >
                    Updates ({taskMetadata.updatesCount})
                  </p>
                </div>
              </div>
              {viewOption !== 'submissions' ? (
                <div>
                  <div className="mt-[49px] lg:flex">
                    {viewOption === 'projectDescription' ? (
                      <div className="mr-[50px] w-full text-[12px] font-normal !leading-[150%] lg:text-[16px]">
                        {imgTaskIPFS ? (
                          <img
                            src={imgTaskIPFS}
                            alt="project desc"
                            className="mb-[50px] h-[375px] w-[375px]"
                          ></img>
                        ) : (
                          <></>
                        )}
                        {(() => {
                          // const cleanHtml = DOMPurify.sanitize(
                          //   '<h1>New project information</h1><p><br></p><h2>Specs</h2><ul><li><strong>Lorem ipsum religaris:</strong></li><li class="ql-indent-1">sddsaddsadsadsasasasasasasasasasasadsadasdsadsadasdasdasdsadwqopidmwqmodw</li><li class="ql-indent-1">qwmpodwopqdmopwqmdopwqmodpmwqopdmpowqmdop</li><li class="ql-indent-1">wqopmdmqwopdmopqwmdopqwpdqwmkopwqmdpowqmdopqwmdopmqwmdop</li><li><strong>Lorem ipsum religaris:</strong></li><li class="ql-indent-1">sddsaddsadsadsasasasasasasasasasasadsadasdsadsadasdasdasdsadwqopidmwqmodw</li><li class="ql-indent-1">qwmpodwopqdmopwqmdopwqmodpmwqopdmpowqmdop</li><li class="ql-indent-1">wqopmdmqwopdmopqwmdopqwpdqwmkopwqmdpowqmdopqwmdopmqwmdop</li></ul><p><br></p><h2>Scope</h2><ul><li><strong>Lorem ipsum religaris:</strong></li><li><strong>Lorem ipsum religaris:</strong></li><li><strong>Lorem ipsum religaris: dsad</strong></li><li><strong>Lorem ipsum religaris:</strong></li><li><strong>Lorem ipsum religaris:</strong></li><li><strong>Lorem ipsum religaris:</strong></li><li><strong>Lorem ipsum religaris:</strong></li></ul>',
                          // )
                          const cleanHtml = DOMPurify.sanitize(
                            taskMetadata.description,
                          )

                          const htmlTransformado = ReactHtmlParser(cleanHtml, {
                            transform,
                          })

                          return (
                            <div>
                              {taskMetadata.engineersRequirement && (
                                <div className="mb-[5px] md:mb-[6px] lg:mb-[7px] xl:mb-[8px] 2xl:mb-[10px]">
                                  <span className="font-bold">
                                    Engineers Needed:
                                  </span>{' '}
                                  {taskMetadata.engineersRequirement}
                                </div>
                              )}
                              {htmlTransformado}
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      <UpdatesList taskId={id.id} />
                    )}
                    <div className="mt-[50px] text-[#505050] lg:mt-0 lg:w-[400px]">
                      <div className="shadow-lg">
                        <div className="flex h-[79px] items-center bg-[#F7F8F9] px-[30px] font-bold">
                          <p>More details</p>
                        </div>
                        <div className="flex h-[270px] items-center px-[30px]">
                          <div>
                            <a
                              href="https://github.com/Openmesh-Network"
                              target="_blank"
                              rel="nofollow noreferrer"
                              className="border-b border-[#0354EC] font-normal text-[#0354EC]"
                            >
                              View on Github
                            </a>
                            <div className="mt-[25px]">
                              <p className="font-bold">Last Updated:</p>
                              <p>
                                {events.length > 0
                                  ? formatDeadlineComplet(events[0].timestamp)
                                  : '-'}
                              </p>
                            </div>
                            <div className="mt-[25px]">
                              <p className="font-bold">Next meeting:</p>
                              <p>-</p>
                            </div>
                            <div className="mt-[5px]">
                              <p>Reach out to a</p>
                              <a className="border-b border-[#000] text-[#000]">
                                verified contributor
                              </a>
                            </div>
                            <div className="mt-[10px] flex gap-x-[20px]">
                              <a
                                href={'https://discord.com/invite/YpaebaVpdx'}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src="/images/task/discord-logo.svg"
                                  alt="image"
                                  className={`w-[20px]`}
                                />{' '}
                              </a>
                              <a
                                href={
                                  'https://join.slack.com/t/openmesh-network/shared_invite/zt-264jtwykh-q0LgEz6EQPKRud1mN8Z_sg'
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src="/images/task/slack-logo.svg"
                                  alt="image"
                                  className={`w-[20px]`}
                                />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-[40px] shadow-lg">
                        <div className="flex h-[79px] items-center bg-[#F7F8F9] px-[30px] font-bold">
                          <p>Contributors</p>
                        </div>
                        <div className="max-h-[500px] overflow-auto px-[30px] pb-[40px] pt-[20px]">
                          {returnContributors()}
                        </div>
                      </div>
                    </div>
                  </div>
                  {viewOption === 'projectDescription' && (
                    <div className=" mt-[50px] flex rounded-md bg-[#F5F5F5] py-[43px] px-[10px] text-center text-[12px]  font-medium !leading-[19px] text-[#505050] lg:mr-[400px] lg:px-0 lg:pl-[49px] lg:text-[16px]">
                      <p>
                        | Have more questions? Reach out to{' '}
                        <a className="border-b border-[#000] text-[#000]">
                          a verified contributor
                        </a>
                      </p>
                      <div className="ml-[30px] flex gap-x-[20px]">
                        <a
                          href={'https://discord.com/invite/YpaebaVpdx'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src="/images/task/discord-logo.svg"
                            alt="image"
                            className={`w-[20px]`}
                          />{' '}
                        </a>
                        <a
                          href={
                            'https://join.slack.com/t/openmesh-network/shared_invite/zt-264jtwykh-q0LgEz6EQPKRud1mN8Z_sg'
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {' '}
                          <img
                            src="/images/task/slack-logo.svg"
                            alt="image"
                            className={`w-[20px]`}
                          />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <ApplicantsSubmissionsList
                  dataApplication={taskMetadata.Application}
                  dataApplicationOffchain={taskMetadata.ApplicationOffChain}
                  dataSubmission={taskMetadata.Submission}
                  taskId={String(taskMetadata.id)}
                  taskPayments={taskMetadata.payments}
                  taskDeadline={String(taskMetadata.deadline)}
                  taskProjectLength={taskMetadata.projectLength}
                  budget={taskMetadata.estimatedBudget}
                  address={address}
                  taskExecutor={taskMetadata.executor}
                  taskCreator={taskMetadata.creator}
                  taskManager={taskMetadata.manager}
                  contributorsAllowed={contributorsAllowed}
                  status={taskMetadata.status}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default TaskView
