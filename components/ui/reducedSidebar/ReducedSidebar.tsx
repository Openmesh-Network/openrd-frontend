'use client'
/* eslint-disable no-unused-vars */
import { useContext, useState } from 'react'

interface ModalProps {
  onClickBurger(): void
  budget: number
  openProjectsNumber: number
  activeProjectsNumber: number
  completedProjectsNumber: number
  uniqueInteractors: number
}

/* eslint-disable react/no-unescaped-entities */
export const ReducedSidebar = ({onClickBurger, budget, openProjectsNumber, activeProjectsNumber, completedProjectsNumber, uniqueInteractors}: ModalProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [selectionSubBar, setSelectionSubBar] = useState<string>('')
  const categoriesOptions = [
    {
      title: 'Infrastructure',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'l3a.svg',
      tags: ['Topology Design', 'Network', 'Xnodes'],
    },
    {
      title: 'Web3 Infrastructure',
      style: '2xl:w-[34px] xl:w-[27px] lg:w-[24px] md:w-[20.4px] w-[17px]',
      image: 'cube.svg',
      tags: ['Topology Design', 'Network', 'Xnodes'],
    },
    {
      title: 'Cloud',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'cloud.svg',
      tags: ['DevOps', 'AWS', 'Kubernets'],
    },
    {
      title: 'Integrations',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'integrations.svg',
      tags: ['Data Integration', 'Third-Party Integration', 'Databricks'],
    },
    {
      title: 'DevOps',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'devops.svg',
      tags: ['DevOps', 'AWS', 'Kubernets'],
    },
    {
      title: 'Data',
      style: '2xl:w-[31px] xl:w-[25px] lg:w-[21.7px] md:w-[18.6px] w-[15.5px]',
      image: 'data.svg',
      tags: ['Data', 'Graph', 'LLM'],
    },
    {
      title: 'Blockchain',
      style: '2xl:w-[29px] xl:w-[23px] lg:w-[20.7px] md:w-[17.6px] w-[14.5px]',
      image: 'blockchain.svg',
      tags: ['Solidity', 'Graph', 'Contracts'],
    },
    {
      title: 'Cryptography & zk',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'crypto.svg',
      tags: ['Cryptography', 'ZK', 'Math'],
    },
    {
      title: 'Apps/dApps',
      style: '2xl:w-[27px] xl:w-[21.6px] lg:w-[19px] md:w-[16.2px] w-[13px]',
      image: 'apps.svg',
      tags: ['Real-time analytics', 'Gamefi', 'Dashboard'],
    },
    {
      title: 'Analytics',
      style: '2xl:w-[30px] xl:w-[24px] lg:w-[21px] md:w-[18px] w-[15px]',
      image: 'analytics.svg',
      tags: ['Knowledge Base', 'Documentation', 'User support'],
    },
  ]

  function renderSubOptions(option: any) {
    return (
      <div className="w-full bg-[#F8F8F8] px-[12.5px] pt-[6.5px] pb-[13.5px] text-[#505050] md:px-[15px] md:pt-[8px] md:pb-[16px] lg:px-[17.5px] lg:pt-[9px] lg:pb-[19px] xl:px-[20px] xl:pt-[10.4px] xl:pb-[21.6px] 2xl:px-[25px] 2xl:pt-[13px] 2xl:pb-[27px]">
        <div className="flex max-w-[90px] flex-wrap gap-x-[3px] overflow-x-auto text-[6px] font-normal  md:max-w-[104px] md:text-[7.2px] lg:max-w-[121px] lg:text-[8.4px] xl:max-w-[140px] xl:text-[9.6px] 2xl:max-w-[174px] 2xl:text-[12px]">
          {option.tags.map((tag: any, index: any) => (
            <p className="underline" key={index}>
              {tag}
              {index !== option.tags.length - 1 && ', '}
            </p>
          ))}
        </div>
        <div className="mt-[15px] text-[6px] font-light md:mt-[18px] md:text-[7.2px] lg:mt-[21px] lg:text-[12px] lg:!leading-[15px] xl:mt-[24px] xl:text-[9.6px] 2xl:mt-[30px] 2xl:text-[12px]">
          Available Funding
        </div>
        <div className="mt-[17px] md:mt-[20px] lg:mt-[24px] xl:mt-[27.2px] 2xl:mt-[34px]">
          <img
            src={`${
              process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                ? process.env.NEXT_PUBLIC_BASE_PATH
                : ''
            }/images/sidebarNav/new-users.svg`}
            alt="image"
            className={`w-[75px] md:w-[94px] lg:w-[110px] xl:w-[125px] 2xl:w-[157px]`}
          />
          <div className="mt-[5px] text-[6px] font-light -tracking-[2.2%] md:mt-[6px] md:text-[7.2px] lg:mt-[7px] lg:text-[8.4px] lg:!leading-[150%] xl:mt-[8px] xl:text-[9.6px] 2xl:mt-[10px] 2xl:text-[12px]">
            5 Contributors
          </div>
        </div>
      </div>
    )
  }

  const formatNumber = (number: number) => {
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  if (!isOpen) {
    return (
      <>
        <div className="z-40 text-[#000] shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)]">
          <div className="">
            <div className="px-[9.5px] pb-[24px] pt-[17px] md:px-[11.5px] md:pb-[30px] md:pt-[20px] lg:px-[13.5px] lg:pb-[34px] lg:pt-[24px] xl:px-[15px] xl:pb-[39px] xl:pt-[27px] 2xl:px-[19px] 2xl:pb-[49px] 2xl:pt-[34px]">
              <img
                onClick={() => setIsOpen(true)}
                src="/images/lateralNavBar/nav-close.svg"
                alt="image"
                className={`mx-auto w-[13px]  cursor-pointer md:w-[14px] md:hover:scale-105 lg:w-[16px] xl:w-[18.5px] 2xl:w-[23px]`}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="relative z-10 h-full  w-fit text-[#000] shadow-[0_0px_5px_0px_rgba(0,0,0,0.10)]">
        <div className="">
          <div className="px-[20px] md:px-[20px] lg:px-[24px] xl:px-[27px] 2xl:px-[34px]">
            <div className="pt-[17px] md:pt-[20px]  lg:pt-[24px]  xl:pt-[27px] 2xl:pt-[34px]">
              <img
                onClick={onClickBurger}
                src="/images/sidebarNav/burguer.svg"
                alt="image"
                className={`mx-auto w-[12px] cursor-pointer md:w-[14.5px] md:hover:scale-105 lg:w-[17px] xl:w-[19px] 2xl:w-[24px]`}
              />
            </div>
            <div className="mt-[23px] md:mt-[28px] lg:mt-[32px] xl:mt-[37px] 2xl:mt-[47px]">
              <img
                src="/images/sidebarNav/carteira.svg"
                alt="image"
                className={`mx-auto w-[15px]  cursor-pointer md:w-[18px] md:hover:scale-105 lg:w-[21px] xl:w-[24px] 2xl:w-[30px]`}
              />
              <div className="mx-auto mt-[5px] flex items-center justify-center text-[8px] font-normal text-[#0354EC] md:text-[9.6px] lg:text-[11.2px] lg:!leading-[150%] xl:text-[12.8px] 2xl:text-[16px]">
                ${formatNumber(budget)}
              </div>
            </div>
            <div className="mt-[23px] md:mt-[26px] lg:mt-[30px] xl:mt-[34px] 2xl:mt-[41px]">
              <img
                src="/images/sidebarNav/grupo.svg"
                alt="image"
                className={`mx-auto w-[15px]  cursor-pointer md:w-[18px] md:hover:scale-105 lg:w-[21px] xl:w-[24px] 2xl:w-[30px]`}
              />
              <div className="mx-auto mt-[5px] flex w-fit items-center justify-center border-b-[1px] text-[8px] font-normal text-[#0354EC] md:text-[9.6px] lg:text-[11.2px] xl:text-[12.8px] 2xl:text-[16px]">
                {uniqueInteractors}{' '}
              </div>
            </div>
            <div className="mt-[23px] md:mt-[26px] lg:mt-[30px] xl:mt-[34px] 2xl:mt-[41px]">
              <img
                src="/images/sidebarNav/file.svg"
                alt="image"
                className={`mx-auto w-[12px]  cursor-pointer md:w-[14px] md:hover:scale-105 lg:w-[17px] xl:w-[19px] 2xl:w-[24px]`}
              />
              <div className="mx-auto mt-[5px] flex w-fit items-center justify-center border-b-[1px] text-[8px] font-normal text-[#0354EC] md:text-[9.6px] lg:text-[11.2px] xl:text-[12.8px] 2xl:text-[16px]">
                {openProjectsNumber}
              </div>
            </div>
          </div>
          <div className="mt-[22.5px] h-[0.7px] w-fit bg-[#E3E3E3] md:mt-[27px] lg:mt-[31.5px] xl:mt-[36px] 2xl:mt-[45px]"></div>
          <div className="mx-auto mt-[20px] grid  gap-y-[27.5px] md:mt-[24px] md:gap-y-[33px] lg:mt-[28px] lg:gap-y-[38.5px] xl:mt-[32px] xl:gap-y-[44px] 2xl:mt-[40px] 2xl:gap-y-[55px]">
            {categoriesOptions.map((option, index) => (
              <div key={index}>
                <div
                //   onClick={() => {
                //     handleButtonClick(option.title)
                //   }}
                  className={`relative flex cursor-pointer justify-center gap-x-[9px] pl-[12px] pr-[10px] text-[9px] font-normal hover:text-[#5b5b5b] md:gap-x-[10.2px] md:pl-[14px] md:pr-[12px]  md:text-[10px] lg:gap-x-[12.6px] lg:pl-[16px] lg:pr-[14px] lg:text-[11px] lg:!leading-[19px] xl:gap-x-[14.4px] xl:pl-[18.5px] xl:pr-[16px] xl:text-[13px] 2xl:gap-x-[18px] 2xl:pl-[23px] 2xl:pr-[20px] 2xl:text-[16px]`}
                >
                  <img
                    src={`/images/sidebarNav/${option.image}`}
                    alt="image"
                    className={`${option.style}`}
                  />
                  <div className="flex items-center gap-x-[6px] md:gap-x-[7.2px] lg:gap-x-[8.4px] xl:gap-x-[9.6px] 2xl:gap-x-[12px]">
                    {selectionSubBar === option.title ? (
                      <img
                        src="/images/sidebarNav/arrow-baixo.svg"
                        alt="image"
                        className="flex w-[8px] items-center lg:w-[9px] 2xl:w-[11px]"
                      />
                    ) : (
                      <img
                        src="/images/sidebarNav/arrow.svg"
                        alt="image"
                        className="flex w-[7px] items-center lg:w-[7px] xl:w-[8px] 2xl:w-[9px]"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-[5px] md:mt-[6px] lg:mt-[7px] xl:mt-[8px] 2xl:mt-[10px]">
                  {' '}
                  {selectionSubBar === option.title && renderSubOptions(option)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
