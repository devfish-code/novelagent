import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Typography,
  message,
  Steps,
  Divider,
  Checkbox,
  Grid,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { projectService } from '../services';
import { useProjectStore } from '../store';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

interface ProjectFormValues {
  name: string;
  requirements?: string;
  force?: boolean;
}

export const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { setProjects } = useProjectStore();
  const [form] = Form.useForm<ProjectFormValues>();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 判断是否为移动端
  const isMobile = !screens.md;

  // 验证项目名称
  const validateProjectName = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入项目名称'));
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return Promise.reject(new Error('项目名称只能包含字母、数字、下划线和连字符'));
    }
    if (value.length > 100) {
      return Promise.reject(new Error('项目名称不能超过100个字符'));
    }
    return Promise.resolve();
  };

  // 提交表单
  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      setLoading(true);
      
      // 初始化项目
      await projectService.initProject({
        name: values.name,
        force: values.force || false,
      });

      message.success('项目创建成功！');
      
      // 刷新项目列表
      const response = await projectService.listProjects();
      setProjects(response.projects);
      
      // 跳转到项目详情页
      navigate(`/projects/${values.name}`);
    } catch (error: any) {
      if (error.code === 'PROJECT_ALREADY_EXISTS') {
        message.error('项目已存在，请勾选"覆盖已存在的项目"或使用其他名称');
      } else {
        message.error(error.message || '创建项目失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 下一步
  const handleNext = async () => {
    try {
      await form.validateFields(['name']);
      setCurrentStep(1);
    } catch (error) {
      // 验证失败，不执行任何操作
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(0);
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            {isMobile ? '' : '返回'}
          </Button>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
            新建项目
          </Title>
        </div>

        {/* 步骤指示器 */}
        <Steps
          current={currentStep}
          direction={isMobile ? 'vertical' : 'horizontal'}
          items={[
            {
              title: '基本信息',
              description: isMobile ? '' : '设置项目名称',
            },
            {
              title: '项目需求',
              description: isMobile ? '' : '输入小说需求（可选）',
            },
          ]}
        />

        {/* 表单 */}
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              force: false,
            }}
          >
            {currentStep === 0 && (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={4}>项目基本信息</Title>
                  <Paragraph type="secondary">
                    请为您的小说项目设置一个唯一的名称。项目名称将用于标识和管理您的项目。
                  </Paragraph>
                </div>

                <Form.Item
                  name="name"
                  label="项目名称"
                  rules={[
                    { required: true, message: '请输入项目名称' },
                    { validator: validateProjectName },
                  ]}
                  extra="只能包含字母、数字、下划线和连字符，不超过100个字符"
                >
                  <Input
                    placeholder="例如：my-novel-project"
                    size="large"
                    maxLength={100}
                  />
                </Form.Item>

                <Form.Item name="force" valuePropName="checked">
                  <Checkbox>
                    覆盖已存在的项目（如果项目名称已存在，将删除旧项目）
                  </Checkbox>
                </Form.Item>

                <Divider />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" size="large" onClick={handleNext}>
                    下一步
                  </Button>
                </div>
              </Space>
            )}

            {currentStep === 1 && (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={4}>项目需求（可选）</Title>
                  <Paragraph type="secondary">
                    您可以在这里输入小说的需求描述，例如题材、风格、主要情节等。
                    这些信息将帮助 AI 更好地理解您的创作意图。如果暂时没有明确的需求，可以跳过此步骤，稍后在项目中添加。
                  </Paragraph>
                </div>

                <Form.Item
                  name="requirements"
                  label="需求描述"
                  extra="可以包含题材、风格、主要角色、情节大纲等信息"
                >
                  <TextArea
                    placeholder="例如：&#10;题材：玄幻修仙&#10;风格：热血、励志&#10;主角：一个普通少年，因机缘巧合踏上修仙之路&#10;情节：从弱小到强大，经历各种试炼和挑战..."
                    rows={10}
                    maxLength={5000}
                    showCount
                  />
                </Form.Item>

                <Divider />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button size="large" onClick={handlePrev}>
                    上一步
                  </Button>
                  <Space>
                    <Button
                      size="large"
                      onClick={() => {
                        form.setFieldValue('requirements', undefined);
                        form.submit();
                      }}
                      loading={loading}
                    >
                      跳过
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      loading={loading}
                    >
                      创建项目
                    </Button>
                  </Space>
                </div>
              </Space>
            )}
          </Form>
        </Card>

        {/* 提示信息 */}
        <Card>
          <Title level={5}>💡 提示</Title>
          <ul>
            <li>
              <Text>项目创建后，您可以在项目详情页面中配置 AI 模型、生成参数等设置。</Text>
            </li>
            <li>
              <Text>建议先测试 AI 连接，确保模型配置正确后再开始生成小说。</Text>
            </li>
            <li>
              <Text>生成过程可能需要较长时间，请耐心等待。您可以随时暂停或恢复生成。</Text>
            </li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};
