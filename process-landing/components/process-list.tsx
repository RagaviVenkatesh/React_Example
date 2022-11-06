import {
  Switch,
  Space,
  Popover,
  Tooltip,
  Typography,
  Button,
  Spin,
  Dropdown,
  Menu,
} from 'antd';
import React from 'react';
import { errorMessage, successMessage } from '../../../../../utils/alert';
import {
  InfoIcon,
  MoreIcon,
  StartIcon,
  UnlinkIcon,
} from '../../../../CustomIcons/icons';
import MasterTableOld from '../../../../master-table-v2';
import MasterTable from '../../../../master-table-v3';
import RadioSelect from '../../../../radio-select';
import { debounce } from 'lodash';
import Bridge from '../../../../../common/bridge/Bridge';
import UnlinkRetireBotModal from '../../../../control-details/unlink-retire-bot';
import useSocket, {
  getControlRoom,
} from '../../../../../common/hooks/useSocket';
import { Link } from 'react-router-dom';
import MultiSelect from '../../../../multi-select';
import { allCountriesList } from '../../../../../utils/country-list-with-coordinates';
import moment from 'moment';
import CustomBadge from '../../../../custom-badge';
import queryString from 'query-string';
import { TenantNameLabel } from '../../../../../friendly-labels/tenant-name';
import { VendorNameLabel } from '../../../../../friendly-labels/vendor-name';
import synchronizer from '../../../../../services/synchronizer';
import RobotSelectModal from './robot-select-modal';
import CustomTooltip from '../../../../custom-tooltip';

const { Paragraph } = Typography;

const ProcessPopoverContent = ({ inputArguments }) => {
  const getProcessInputArguments = React.useCallback(() => {
    if (inputArguments === undefined || inputArguments === null) {
      return {};
    }
    if (typeof inputArguments === 'string' && inputArguments !== '') {
      return JSON.parse(inputArguments);
    }
    return inputArguments;
  }, [inputArguments]);
  return (
    <div className="ml-3 mr-3">
      <p>"InputArguments" : {`{`}</p>
      {Object.entries(getProcessInputArguments()).map(([key, value]) => (
        <p>{`"${key}" : "${value}",`}</p>
      ))}
      {`}`}
    </div>
  );
};

enum ProcessView {
  PRODUCTION = 'Production',
  TEST = 'Test',
  RETIRED = 'Retired',
}
const processViewList = Object.values(ProcessView).map((v) => v);
const defaultQuery = { query: { where: {} } };

const ProcessListV2 = ({
  getAllProject,
  trackProcessAPI,
  getProcessListAPI,
  updateLinkOfRpaControlProcess,
  unlinkProcess,
  organisationId,
  linkCountries,
  getProcessJobsAPI,
}: ProcessListProps) => {
  const [currentView, setCurrentView] = React.useState(ProcessView.PRODUCTION);
  const [unlinkModalData, setUnlinkModalData] = React.useState({
    processName: '',
    visible: false,
    processId: null,
    tenantName: '',
    projectName: '',
    isLoading: false,
  });

  const [robotSelectModal, setRobotSelectModal] = React.useState({
    visible: false,
    processId: '',
    processKey: '',
    organizationUnitId: '',
    tenantId: '',
    vendor: '',
  });

  const [query, setQuery] = React.useState(defaultQuery);
  const queryRef = React.useRef(query);
  queryRef.current = query;
  const [isLegacyView, setLegacyView] = React.useState(true);
  const [projectList, setProjectList] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [processList, setProcessList] = React.useState([]);
  const [processJobs, setProcessJobs] = React.useState([]);
  const [tableView, setTableView] = React.useState('1');
  const [filter, setFilter] = React.useState([]);
  const filterRef = React.useRef([]);
  const [processCount, setProcessCount] = React.useState(0);
  const [processJobsCount, setProcessJobsCount] = React.useState(0);
  filterRef.current = filter;

  const processesColumns: any[] = [
    {
      title: 'TRACK',
      dataIndex: '_track',
      enableFilter: false,
      enableSort: true,
      toggle: false,
      renderCell: (_track: string, row: any) => {
        const { processId, processName: name } = row;
        const isSwitchDisabled = row?.links?.some(
          (link) => link?.rel === 'track-control-rpa-process',
        );
        return (
          <>
            <Switch
              onChange={(checked) => onSwitchChange(checked, processId, name)}
              size="small"
              disabled={!isSwitchDisabled}
              checked={row._track === 'On'}
            />
          </>
        );
      },
      search: {
        name: 'trackProcess',
      },
    },
    {
      title: 'NAME',
      dataIndex: 'processName',
      enableFilter: true,
      enableSort: true,
      renderCell: (name: string, record: any) => (
        <>
          {record._track !== 'Off' ? (
            <span className="table-link text-neutral-2">
              <Link
                className="text-neutral-2"
                to={`/control/v3/rpa/process/${record.newProcessId}${
                  record?.tenantIdV3 ? `/overview/${record?.tenantIdV3}` : ''
                }`}>
                {name}
              </Link>
            </span>
          ) : (
            <span className="text-neutral-2">{name}</span>
          )}
        </>
      ),
      search: {
        name: 'name',
      },
    },
    // {
    //   title: 'STATUS',
    //   dataIndex: 'runningStatus',
    //   enableSort: true,
    //   renderText: (runningStatus) =>
    //     runningStatus === true ? 'Running' : 'Idle',
    //   renderCell: (status, data) =>
    //     data.runningStatus === true ? (
    //       <CustomBadge text={status} />
    //     ) : (
    //       <CustomBadge color="#6E7D91" text={status} />
    //     ),
    // },
    {
      title: 'VENDOR',
      dataIndex: 'processVendor',
      enableFilter: true,
      enableSort: true,
      renderText: (processVendor) => processVendor || '-',
      renderCell: (text, record) => (
        <VendorNameLabel vendorId={record.processVendor} />
      ),
      search: {
        name: 'vendorId',
        placeholder: 'vendor',
        moduleName: 'vendor',
        type: 'single-select',
      },
    },
    {
      title: 'TENANT',
      dataIndex: 'tenantName',
      enableFilter: true,
      enableSort: false,
      renderText: (tenantName) => tenantName || '-',
      renderCell: (text, record) =>
        <TenantNameLabel tenantId={record.tenantName} /> || '-',
      search: {
        name: 'tenantId',
        placeholder: 'tenant',
        moduleName: 'tenant',
        type: 'single-select',
      },
    },
    {
      title: 'LINKED TO PROJECT',
      dataIndex: 'linkedToProject',
      enableFilter: true,
      enableSort: false,
      customInputId: 'completed-project-search',
      dataType: 'custom',
      filterIndex: 'projectId',
      renderCell: (text, record) => (
        <RadioSelect
          defaultAllSelected={false}
          data={projectList}
          onAddSucess={async () =>
            await getProcesses(query, true, filterRef.current)
          }
          displayIndex="projectName"
          valueIndex="_id"
          defaultValue={record.projectDetails}
          okText="Done"
          onClickOk={async (projectId) => {
            const body = {
              projectId: projectId,
            };
            const { processId: processId } = record;
            setIsLoading(true);
            const res = await updateLinkOfRpaControlProcess(processId, body);
            setIsLoading(false);
            if (res) {
              successMessage({
                content: 'Project linked sucessfully',
              });
              init(query, filterRef.current);
            } else {
              errorMessage({
                content: 'Error linking project',
              });
            }
          }}
          key={record.processId + 'multi-select'}
          startLetterSearch={true}
        />
      ),
      search: {
        name: 'projectId',
        placeholder: 'project',
        moduleName: 'project',
        type: 'single-select',
      },
    },
    {
      title: 'COUNTRY',
      dataIndex: 'countries',
      enableSearch: true,
      enableSort: false,
      renderText: (countries) =>
        countries?.length ? countries.join(', ') : '-',
      renderCell: (countries, record) => {
        const isEditable = record?.links?.some(
          (link) => link?.rel === 'update-country-control-rpa-process',
        );

        return isEditable ? (
          <MultiSelect
            defaultAllSelected={false}
            data={allCountriesList}
            displayIndex="name"
            valueIndex="name"
            defaultValue={record.countries}
            okText="Ok"
            onClickOk={async (countryList) => {
              setIsLoading(true);
              const res = await linkCountries(record.processId, {
                countries: countryList,
              });
              if (res) {
                successMessage({
                  content: 'Country updated successfully',
                });
              } else {
                errorMessage({
                  content: 'Error updating country',
                });
              }
              setIsLoading(false);
              getProcesses(queryRef.current, true, filterRef.current);
            }}
            key={record.processId + 'multi-select'}
            startLetterSearch={true}
          />
        ) : (
          countries
        );
      },
      search: {
        name: 'countries',
        placeholder: 'country',
        moduleName: 'countries',
        type: 'single-select',
      },
    },
    {
      title: 'INPUT',
      dataIndex: 'input',
      enableFilter: false,
      enableSort: false,
      defaultVisible: false,
      renderCell: (input: string, row: any) => {
        return (
          <Space align="center">
            {input}
            {row.input === 'Yes' && (
              <Popover
                title="Input"
                placement="rightTop"
                content={
                  <ProcessPopoverContent
                    inputArguments={row.processInputArguments}
                  />
                }>
                <InfoIcon
                  style={{
                    fontSize: 16,
                    color: '#A8B1BD',
                  }}
                />
              </Popover>
            )}
          </Space>
        );
      },
    },
    {
      title: 'CODE VERSION',
      dataIndex: 'processVersion',
      enableFilter: false,
      defaultVisible: false,
      enableSort: false,
    },
    // {
    //   title: 'LAST RUN TIME',
    //   dataIndex: 'runningStatusUpdatedTime',
    //   enableFilter: true,
    //   enableSort: true,
    //   renderText: (time) =>
    //     time ? moment(time).format('yyyy-MM-DD HH:mm:ss') : '-',
    // },
    {
      title: 'DESCRIPTION',
      dataIndex: 'processDescription',
      enableFilter: true,
      enableSort: true,
      renderCell: (description, record) => {
        const [isExpanded, setIsExpanded] = React.useState(false);
        return (
          <Tooltip title={description} visible={isExpanded}>
            <Paragraph
              style={{ marginBottom: 0, width: 100 }}
              ellipsis={{
                expandable: true,
                rows: 3,
                symbol: (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                    }}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                      className="table-link">
                      {isExpanded ? 'Close' : 'Read more'}
                    </span>
                  </div>
                ),
              }}>
              {record?.processDescription}
            </Paragraph>
          </Tooltip>
        );
      },
      search: {
        name: 'description',
        placeholder: 'description',
      },
    },
    {
      aliasTitle: 'Menu',
      dataIndex: '',
      toggle: false,
      renderCell: (_, record: any) => {
        const isLinkMenuItemShow = record?.links?.some(
          (link) => link?.rel === 'link-control-process-to-project',
        );
        return (
          <>
            {record.projectDetails && isLinkMenuItemShow ? (
              <Dropdown
                overlay={
                  <Menu className="text-neutral-2" theme="dark">
                    <Menu.Item
                      icon={
                        <UnlinkIcon
                          style={{
                            fontSize: 16,
                            color: '#A8B1BD',
                          }}
                        />
                      }
                      onClick={() => {
                        setUnlinkModalData(() => ({
                          ...unlinkModalData,
                          processName: record.processName,
                          visible: true,
                          type: 'unlink',
                          processId: record._id,
                          projectName: record.projectDetails?.projectName,
                        }));
                      }}>
                      <span className="text-neutral-2">Unlink</span>
                    </Menu.Item>
                    {record.processVendor?.includes('uipath') && (
                      <Menu.Item
                        onClick={() => {
                          console.log(record);
                          setRobotSelectModal({
                            visible: true,
                            processId: record.newProcessId,
                            processKey: record.processKey,
                            organizationUnitId: record.organizationUnitId,
                            tenantId: record.tenantIdV3,
                            vendor: record.vendor,
                          });
                        }}
                        icon={<StartIcon className="font-16" />}>
                        Run manually
                      </Menu.Item>
                    )}
                  </Menu>
                }
                placement="bottomRight"
                trigger={['click']}>
                <MoreIcon tabIndex="-1" className="font-16" />
              </Dropdown>
            ) : (
              record.processVendor?.includes('uipath') && (
                <Dropdown
                  overlay={
                    <Menu className="text-neutral-2" theme="dark">
                      <Menu.Item
                        onClick={() => {
                          setRobotSelectModal({
                            visible: true,
                            processId: record.newProcessId,
                            processKey: record.processKey,
                            organizationUnitId: record.organizationUnitId,
                            tenantId: record.tenantIdV3,
                            vendor: record.vendor,
                          });
                        }}
                        icon={<StartIcon className="font-16" />}>
                        Run manually
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomRight"
                  trigger={['click']}>
                  <MoreIcon tabIndex="-1" className="font-16" />
                </Dropdown>
              )
            )}
          </>
          // <Button
          //   icon={<StartIcon className="font-16 text-neutral-5" />}
          //   type="text"></Button>
        );
      },
    },
  ];
  const [columns, setColumns] = React.useState(processesColumns);

  const { getEvent, removeEvent } = useSocket(`${organisationId}/RPAProcesses`);
  const synchronizerEvent = useSocket(getControlRoom(organisationId));

  let urls = ['localhost', 'dev.turbotic.com', 'test.turbotic.com'];
  let { url: currentURL } = queryString.parseUrl(window.location.href);
  let isDevelopment: any = urls.find((url) => currentURL.includes(url));
  let allowedOrgs: any[] = ['61dcbae185637d203acf402d'];
  if (allowedOrgs.indexOf(organisationId) > -1) {
    isDevelopment = true;
  }
  const init = async (query, filter) => {
    const data = await getAllProject({}, false, 'v2');
    if (data?.data) {
      setProjectList(data?.data);
      getProcesses(query, true, filter);
    }
  };
  const getProcesses = React.useCallback(
    async (query, loadingNeed, functionId) => {
      setIsLoading(loadingNeed && true);
      const res = await getProcessListAPI(query, functionId);
      let legacyView: boolean = res?.isLegacy ? true : false;
      setLegacyView(legacyView);
      const processJobsResponse = await getProcessJobsAPI(query, functionId);
      setProcessJobs(processJobsResponse.data);
      setProcessCount(res.totalCount);
      setProcessJobsCount(processJobsResponse.totalCount);
      setProcessList(res.data);
      setIsLoading(false);
    },
    [],
  );

  const onSwitchChange = async (
    checked: boolean,
    trackId: string,
    name?: string,
  ) => {
    const mode = checked ? 'TrackOn' : 'TrackOff';
    setIsLoading(true);
    const res = await trackProcessAPI(trackId, mode);
    setIsLoading(false);
    if (res.error) {
      errorMessage({
        content: `Error ${checked ? 'tracking' : 'untracking'} process`,
      });
    } else {
      successMessage({
        content: `${name} ${checked ? 'tracked' : 'untracked'} successfully`,
      });
      getProcesses(query, true, filterRef.current);
    }
  };

  const search = React.useCallback(
    debounce((q) => {
      console.log('\n searching...', q);
      setQuery(q);
      if (q.query.where !== undefined) {
        getProcesses(q, true, filterRef.current);
      }
    }, 300),
    [],
  );

  React.useEffect(() => {
    const filterLs = localStorage.getItem('processFilter');
    const filterLsArray = filterLs ? filterLs.split(',').filter((f) => f) : [];
    setFilter(filterLsArray);
    init(defaultQuery, filterLsArray);
    const unsubscribe = Bridge.addEventListener(
      'control-v2/on-process-sync',
      () => getProcesses(queryRef.current, true, filterRef.current),
    );

    const subscribeFilter = Bridge.addEventListener(
      'process/filterChanged',
      (value) => {
        setFilter(value);
        getProcesses(queryRef.current, true, value);
      },
    );
    if (synchronizer.selectedSource === 'legacy-webhook') {
      getEvent('rpa_process_created', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_updated', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_deleted', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });

      getEvent('rpa_process_started', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_completed', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_exceptioned', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_stopped', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
      getEvent('rpa_process_suspened', () => {
        getProcesses(queryRef.current, false, filterRef.current);
      });
    }

    if (synchronizer.selectedSource === 'synchronizer') {
      synchronizerEvent.getEvent(
        'PROCESSES/UPDATED',
        debounce(() => {
          getProcesses(queryRef.current, false, filterRef.current);
        }, 300),
      );
      synchronizerEvent.getEvent(
        'PROCESSES/ADDED',
        debounce(() => {
          getProcesses(queryRef.current, false, filterRef.current);
        }, 300),
      );
      synchronizerEvent.getEvent(
        'PROCESSES/DELETED',
        debounce(() => {
          getProcesses(queryRef.current, false, filterRef.current);
        }, 300),
      );
    }

    return () => {
      unsubscribe();
      if (synchronizer.selectedSource === 'legacy-webhook') {
        removeEvent('rpa_process_completed');
        removeEvent('rpa_process_exceptioned');
        removeEvent('rpa_process_stopped');
        removeEvent('rpa_process_suspened');
        removeEvent('rpa_process_created');
        removeEvent('rpa_process_updated');
        removeEvent('rpa_process_deleted');
        removeEvent('rpa_process_started');
      }
      if (synchronizer.selectedSource === 'synchronizer') {
        synchronizerEvent.removeEvent('PROCESSES/UPDATED');
        synchronizerEvent.removeEvent('PROCESSES/ADDED');
        synchronizerEvent.removeEvent('PROCESSES/DELETED');
      }
      subscribeFilter();
    };
  }, []);

  const processesColumns2 = [
    {
      title: 'NAME',
      dataIndex: 'processName',
      enableFilter: true,
      enableSort: true,
      renderCell: (name: string, record: any) => (
        <>
          {record._track !== 'Off' ? (
            <span className="table-link text-neutral-2">
              <Link
                className="text-neutral-2"
                to={`/control/v3/rpa/process/${record.newProcessId}${
                  record?.tenantIdV3 ? `/overview/${record?.tenantIdV3}` : ''
                }`}>
                {name}
              </Link>
            </span>
          ) : (
            <span className="text-neutral-2">{name}</span>
          )}
        </>
      ),
    },
    {
      title: 'Completed',
      dataIndex: 'completedJobs',
      enableFilter: false,
      enableSort: true,
    },
    {
      title: 'Exceptioned',
      dataIndex: 'exceptionedJobs',
      enableFilter: false,
      enableSort: true,
    },
    {
      title: 'Stopped',
      dataIndex: 'stoppedJobs',
      enableFilter: false,
      enableSort: true,
    },
    {
      title: 'Suspended',
      dataIndex: 'suspendedJobs',
      enableFilter: false,
      enableSort: true,
    },
    {
      title: 'Running',
      dataIndex: 'runningJobs',
      enableFilter: false,
      enableSort: true,
    },
    {
      title: 'Warning',
      dataIndex: 'warningJobs',
      enableFilter: false,
      enableSort: true,
    },
  ];

  const handleCloseUnlinkModal = () =>
    setUnlinkModalData((oldvalue: any) => ({
      processName: '',
      visible: false,
      processId: null,
      tenantName: '',
      projectName: '',
      isLoading: false,
    }));

  const handleConfirmUnlinkModal = async () => {
    setUnlinkModalData((oldvalue: any) => ({
      ...oldvalue,
      isLoading: true,
    }));
    const res = await unlinkProcess(unlinkModalData.processId);
    if (res) {
      handleCloseUnlinkModal();
      getProcesses(query, true, filterRef.current);
      successMessage({
        content: `${unlinkModalData.processName} unlinked successfully`,
      });
    } else {
      setUnlinkModalData((oldvalue: any) => ({
        ...oldvalue,
        isLoading: false,
      }));
      errorMessage({
        content: `Error unlinking process ${unlinkModalData.processName}`,
      });
    }
  };

  const data = React.useMemo(() => {
    if (processList?.length > 0) {
      return processList.map((p) => ({
        _track: p.trackProcess,
        processId: p._id,
        processName: p.processName,
        processVendor: p.processVendor,
        tenantName: p.tenant?.tenantName || '-',
        input:
          p?.processInputArguments === '' ||
          p?.processInputArguments === null ||
          p?.processInputArguments === undefined
            ? 'No'
            : 'Yes',
        processVersion: p.processVersion || '-',
        processDescription: p.processDescription || '-',
        links: p.links,
        processInputArguments: p.processInputArguments,
        linkedToProject:
          projectList.find((pro) => pro._id === p.project?._id)?.projectName ||
          '-',
        projectDetails: p?.project,
        _id: p?._id,
        newProcessId: p.processId,
        countries: p.countries,
        runningStatusUpdatedTime: p.runningStatusUpdatedTime,
        runningStatus: p.runningStatus,
        tenantIdV3: p.tenantIdV3,
        meta: p.meta,
        processKey: p.processKey,
        organizationUnitId: p.organizationUnitId,
      }));
    }
    return [];
  }, [processList, projectList]);

  React.useEffect(() => {
    if (synchronizer.selectedSource === 'synchronizer') {
      const hasAA = data.some((p) => p?.meta?.folderPath);
      if (hasAA) {
        const finalColumns = [...processesColumns];
        finalColumns.splice(3, 0, {
          title: 'FOLDER',
          dataIndex: 'meta',
          enableFilter: true,
          enableSort: true,
          renderText: (meta) => meta?.folderPath || '-',
          renderCell: (folderPath) => <div>{folderPath}</div>,
        });
        setColumns(finalColumns);
      } else {
        setColumns(processesColumns);
      }
    }
  }, [data]);

  const data2 = React.useMemo(() => {
    if (processJobs?.length > 0) {
      return processJobs.map((p) => ({
        _id: p._id,
        newProcessId: p.processId,
        processId: p.processId,
        tenantIdV3: p.tenantId,
        processName: p.processName,
        completedJobs: p.completedJobs || '-',
        exceptionedJobs: p.exceptionedJobs || '-',
        stoppedJobs: p.stoppedJobs || '-',
        suspendedJobs: p.suspendedJobs || '-',
        runningJobs: p.runningJobs || '-',
        warningJobs: p.warningJobs || '-',
      }));
    }
    return [];
  }, [processJobs]);
  return (
    <Spin spinning={isLoading}>
      <div className="mt-5">
        {isLegacyView ? (
          // old view
          <MasterTableOld
            columns={tableView === '1' ? columns : processesColumns2}
            data={tableView === '1' ? data : data2}
            primaryKeyColumn="_id"
            persistanceKey="control-rpa-process-list"
            refreshData={search}
            title={
              <>
                Processes{' '}
                <CustomTooltip
                  content="Processes are the processes from your vendors that are connected to Turbotic. 
                  Track processes to get data from the processes (Uipath, Blueprism, AA) and Workflows (PA)."
                />
              </>
            }
            titleHaveBackground={true}
            tableView={tableView}
            setTableView={setTableView}
            // enableTableView2={true}
          />
        ) : (
          // new view
          <MasterTable
            columns={tableView === '1' ? columns : processesColumns2}
            data={tableView === '1' ? data : data2}
            primaryKeyColumn="_id"
            persistanceKey="control-rpa-process-list"
            refreshData={search}
            title={
              <>
                Processes{' '}
                <CustomTooltip
                  content="Processes are the processes from your vendors that are connected to Turbotic. 
                  Track processes to get data from the processes (Uipath, Blueprism, AA) and Workflows (PA)."
                />
              </>
            }
            titleHaveBackground={true}
            tableView={tableView}
            setTableView={setTableView}
            // enableTableView2={true}
            total={tableView === '1' ? processCount : processJobsCount}
            enableUrlState={true}
            // searchFields={['name', 'vendorId']}
            searchEnabled={false}
          />
        )}
        <UnlinkRetireBotModal
          visible={unlinkModalData.visible}
          handleCancel={() => handleCloseUnlinkModal()}
          type="unlink"
          handleYes={() => handleConfirmUnlinkModal()}
          botName={unlinkModalData.processName}
          projectName={unlinkModalData.projectName}
          isSpinning={unlinkModalData.isLoading}
        />
        <RobotSelectModal
          {...robotSelectModal}
          handleCancel={() =>
            setRobotSelectModal({
              visible: false,
              processId: '',
              processKey: '',
              organizationUnitId: '',
              tenantId: '',
              vendor: '',
            })
          }
          onSuccess={() => {
            getProcesses(queryRef.current, false, filterRef.current);
          }}
        />
      </div>
    </Spin>
  );
};

export default ProcessListV2;

export interface ProcessListProps {
  getAllProject: (
    data?: any,
    shouldForce?: boolean,
    version?: string,
  ) => Promise<any>;
  trackProcessAPI: (
    processId: string,
    mode: 'TrackOn' | 'TrackOff',
  ) => Promise<any>;
  getProcessListAPI: (query, functionId) => Promise<any>;
  updateLinkOfRpaControlProcess: (processId, data) => Promise<any>;
  organisationId: string;
  unlinkProcess: (processId) => Promise<any>;
  linkCountries: (id, countries) => Promise<any>;
  getProcessJobsAPI?: (query: any, functionId) => Promise<any>;
}
