/* eslint-disable react/no-unescaped-entities */
// import Image from 'next/image'
/* eslint-disable dot-notation */
/* eslint-disable no-unused-vars */
'use client'
// import { useState } from 'react'
import 'react-toastify/dist/ReactToastify.css'
import { useAccount } from 'wagmi'

const HeroVerifiedContributor = () => {
  return (
    <section className="border-b border-[#CFCFCF] px-[20px] pb-[50px] pt-[40px] lg:px-[100px] lg:pb-[70px] lg:pt-[59px]">
      <div className="container px-0">
        <div className="flex flex-wrap items-start">
          <div className="w-full 2xl:w-2/3">
            <div className="mb-1 flex">
              <p className="text-[16px] font-bold !leading-[150%] text-[#000000] lg:text-[20px]">
                Become a Verified Contributor{' '}
              </p>
              <img
                src={`${
                  process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                    ? process.env.NEXT_PUBLIC_BASE_PATH
                    : ''
                }/images/verified-contributor/check.svg`}
                alt="image"
                className={`ml-[10px] flex w-[15px] cursor-pointer items-center lg:w-[17px]`}
              />
            </div>
          </div>
          <div className="mt-[25px] max-w-[1169px] text-[#505050]">
            <p className="text-[11px] font-medium !leading-[17px] lg:text-[14px]">
              Verified contributors are set of users that have more access to
              functionalities such as approving tasks, adjusting project
              deadlines, and voting for applicants. They typically are core
              developers and researchers with technical knowledge and expertise
              in the fields and are vetted by the community.
            </p>
          </div>
          <div className="mt-[25px] flex text-[11px] font-medium !leading-[17px] text-[#505050] lg:text-[14px]">
            <div className="mr-[20px]">
              <div className="flex">
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                      ? process.env.NEXT_PUBLIC_BASE_PATH
                      : ''
                  }/images/verified-contributor/check-3.svg`}
                  alt="image"
                  className={`mr-[4px] w-[12px]`}
                />
                <p>Approve tasks and proposals</p>
              </div>
              <div className="mt-[15px] flex">
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                      ? process.env.NEXT_PUBLIC_BASE_PATH
                      : ''
                  }/images/verified-contributor/check-3.svg`}
                  alt="image"
                  className={`mr-[4px] w-[12px]`}
                />
                <p>Adjust project budget and timeline</p>
              </div>
            </div>
            <div>
              <div className="flex">
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                      ? process.env.NEXT_PUBLIC_BASE_PATH
                      : ''
                  }/images/verified-contributor/check-3.svg`}
                  alt="image"
                  className={`mr-[4px] w-[12px]`}
                />
                <p>Nominate applicants</p>
              </div>
              <div className="mt-[15px] flex">
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                      ? process.env.NEXT_PUBLIC_BASE_PATH
                      : ''
                  }/images/verified-contributor/check-3.svg`}
                  alt="image"
                  className={`mr-[4px] w-[12px]`}
                />
                <p>Vote on governance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroVerifiedContributor
