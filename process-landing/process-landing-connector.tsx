import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ProcessLanding from '.';
import { customAxios, useAxios } from '../../../../hooks/axios';
import {
  getProjectSettingsFunctionsAction,
  getProjectSettingsAreasAction,
} from '../../../../redux/actions/project-settings';
import { getCustomFieldAction } from '../../../../redux/actions/projects';
import { getUsersAction } from '../../../../redux/actions/users';
import synchronizer from '../../../../services/synchronizer';

const ProcessLandingConnector = () => {
  const [getProcessList] = useAxios({
    url: `control/rpa/panel/processes`,
  });
  const [getAllProjectsForProcess] = useAxios({
    url: `projects?where[projectStatus]=Completed`,
  });
  const dispatch = useDispatch();
  const organisationId = useSelector(
    (state: any) => state.Context?.currentOrganisation?.organisationId,
  );
  React.useEffect(() => {
    dispatch(getCustomFieldAction.request());
    dispatch(getUsersAction.request());
    dispatch(getProjectSettingsFunctionsAction.request());
    dispatch(getProjectSettingsAreasAction.request());
  }, []);

  const trackProcessAPI = async (
    processId: string,
    mode: 'TrackOn' | 'TrackOff',
  ) => {
    const res = await synchronizer.control.rpa.processes.trackProcess(
      processId,
      mode,
    );

    if (res.response) {
      getProcessList();
    }
    return res;
  };

  const getTotalJobsAPI = React.useCallback(async (filter) => {
    const res = await synchronizer.control.rpa.processes.getTotalJobs(filter);
    return res;
  }, []);

  const getProcessJobsAPI = React.useCallback(
    async (query?: any, filter?: any) => {
      const res = await synchronizer.control.rpa.processes.getProcessJobs(
        query,
        filter,
      );
      return res;
    },
    [],
  );

  const getJobPerformanceAPI = React.useCallback(async (filter) => {
    const res = await synchronizer.control.rpa.processes.getJobPerformance(
      filter,
    );
    return res;
  }, []);

  const getTotalProcessesCountAPI = React.useCallback(async (filter) => {
    const res = await synchronizer.control.rpa.processes.getTotalProcessesCount(
      filter,
    );
    return res;
  }, []);

  const getProcessListAPI = React.useCallback(async (query, filter) => {
    const res = await synchronizer.control.rpa.processes.getProcessList(
      query,
      filter,
    );
    return res;
  }, []);

  const updateLinkOfRpaControlProcess = React.useCallback(
    async (processId, body) => {
      return await synchronizer.control.rpa.processes.updateLinkOfRpaControlProcess(
        processId,
        body,
      );
    },
    [],
  );
  const getScheduledProcessAPI = React.useCallback(
    async (startDate: string, numberOfDays: number) => {
      const res = await customAxios({
        url: `control/rpa/panel/jobhistory?weekStartDate=${startDate}&numberOfDays=${numberOfDays}`,
      });
      return res?.response?.data;
    },
    [],
  );
  const unlinkProcess = React.useCallback(async (processId) => {
    return await synchronizer.control.rpa.processes.unlinkProcess(processId);
  }, []);

  const linkCountries = React.useCallback(async (id, countries) => {
    const res = await synchronizer.control.rpa.processes.linkCountries(
      id,
      countries,
    );
    return res;
  }, []);

  const getJobsDetailsByStatusAPI = React.useCallback(
    async (statusFilter, startTime?, endTime?, filter?, bodyQuery?) => {
      const res =
        await synchronizer.control.rpa.processes.getJobsDetailsByStatus(
          statusFilter,
          startTime,
          endTime,
          filter,
          bodyQuery,
        );
      return res;
    },
    [],
  );

  const getErrorCount = React.useCallback(async (fromDate?, toDate?) => {
    console.log(fromDate, toDate, 'Data ------>');
    const res = await customAxios(
      {
        url: '/control/overview/getErrorCountComparisonByDates',
        method: 'post',
      },
      false,
      {
        categoryTypes: ['all'],
        processIds: ['all'],
        range1: {
          startDate: fromDate,
          endDate: toDate,
          // startDate: "2022-04-01T00:00:00.969Z",
          // endDate: "2022-05-04T00:00:00.969Z"
        },
      },
      'v3',
    );
    return res?.response?.data;
  }, []);

  return (
    <ProcessLanding
      processList={{
        getAllProject: getAllProjectsForProcess,
        trackProcessAPI: trackProcessAPI,
        getProcessListAPI: getProcessListAPI,
        updateLinkOfRpaControlProcess: updateLinkOfRpaControlProcess,
        organisationId: organisationId,
        unlinkProcess,
        linkCountries,
      }}
      getTotalJobsAPI={getTotalJobsAPI}
      getProcessJobsAPI={getProcessJobsAPI}
      getJobPerformanceAPI={getJobPerformanceAPI}
      getTotalProcessesCountAPI={getTotalProcessesCountAPI}
      getScheduledProcessAPI={getScheduledProcessAPI}
      organisationId={organisationId}
      getJobsDetailsByStatusAPI={getJobsDetailsByStatusAPI}
      getErrorCount={getErrorCount}
    />
  );
};

export default ProcessLandingConnector;
