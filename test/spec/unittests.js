/*
    Insight project framework

    Framework for implementing Insight projects
    
    (c) Copyright 2023 Fair Isaac Corporation
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

describe("Project framework", function () {
    'use strict';
    /* global jasmine */
    /* global _ */
    /* global ProjectFramework */
    /* global spyOn */
    /* global expect */


    var project;

    // test data
    var users_v4 = [
        {
            _data: {
                username: "admin",
                displayName: "Administrator User"
            }
        }
    ];
    var users = [
        {
            username: "admin",
            name: "Administrator User"
        }
    ];
    var projects = [
        {
            id: 'test-folder-id',
            name: 'test project',
            objectType: 'FOLDER',
            owner: users[0]
        },
        {
            id: 'test-folder2-id',
            name: 'test2 project',
            objectType: 'FOLDER',
            owner: users[0]
        }
    ];
    var scenarios = [
        {
            id: 'test-scenario-id',
            name: 'test project',
            objectType: 'SCENARIO',
            scenarioType: 'PROJECT',
            parent: projects[0]
        },
        {
            id: 'test-scenario2-id',
            name: 'a scenario',
            objectType: 'SCENARIO',
            scenarioType: 'SCENARIO',
            parent: projects[0]
        }
    ];
    var rootChildren =
        [
            {
                id: 'folder-id-1',
                name: 'existing project 1',
                objectType: 'FOLDER',
                owner: {
                    username: 'admin',
                    name: "Administrator User"
                }
            },
            {
                id: 'scenario-id-1',
                name: 'an orphan scenario',
                objectType: 'SCENARIO',
                owner: {
                    username: 'admin',
                    name: "Administrator User"
                }
            },
            {
                id: 'folder-id-2',
                name: 'existing project 2',
                objectType: 'FOLDER',
                owner: {
                    username: 'admin',
                    name: "Administrator User"
                }
            },
            {
                id: 'folder-id-3',
                name: 'existing project 3',
                objectType: 'FOLDER',
                owner: {
                    username: 'anotheruser',
                    name: "Another User"
                }
            }
        ];

    var rootChildren_v4 =
        [
            {
                id: 'folder-id-1',
                name: 'existing project 1',
                objectType: 'FOLDER',
                ownerId: 'admin'
            },
            {
                id: 'scenario-id-1',
                name: 'an orphan scenario',
                objectType: 'SCENARIO',
                ownerId: 'admin'
            },
            {
                id: 'folder-id-2',
                name: 'existing project 2',
                objectType: 'FOLDER',
                ownerId: 'admin'
            }
        ];

    var user = {
        getFullName: function() { return ("Administrator User");}
    };
    var app = {
        getId: function () {
            return "1234";
        },
        createScenario: function () {
        },
        createFolder: function () {
        },
        getModelSchema: function () {
            return window.schema;
        },
        getUsers: function () {
        }
    }
    var view = {
        getApp: function () {
            return app;
        },
        executeScenario: function () {
        },
        setShelf: function () {
        },
        getScenarioIds: function () {},
        showErrorMessage: function () {
        },
        showInfoMessage: function () {},
        withAllScenarios: function () {
            return window.observer;
        },
        withFirstScenario: function () {
            return window.observer;
        },
        configure: function () {},
        importFromServer: function() {
        },
        getUser: function () {
            return Promise.resolve(
                user
            );
        }
    };

    beforeEach(function () {
        jasmine.Ajax.install();

        // mock the insight interface
        window.observer = {
            withEntities: function () {
                return this;
            },
            notify: function (f) {
                if (f) f();
                return this;
            },
            once: function (f) {
                if (f) f();
                return this;
            },
            withSummaryData: function () {
                return this;
            },
            start: function () {
            }
        };
        window.schema = {
            getAllEntities: function () {
            }
        };


        window.insight = {
            getView: function () {
                return view;
            },
            openView: function () {
            },
            enums: {
                ExecutionType: {
                    LOAD: 'LOAD',
                    RUN: 'RUN'
                }
            },
            resolveRestEndpoint: jasmine.createSpy().and.callFake(_.identity),
            getVersion: function () {
                return 4;
            } // default to V4
        };
        window.VDL = function() {
        };
        window.VDL.createVariable = function(v) { return function() { return v; } }

        project = new ProjectFramework();

        spyOn(project, "_initShelfValidation");
        spyOn(project, "_initProjectRevisionTracking");

        project.init();
        expect(project._initShelfValidation).toHaveBeenCalled();

        spyOn(project.view, "showErrorMessage");
        project.api.BASE_REST_ENDPOINT = "http://localhost:8860/" + project.api.BASE_REST_ENDPOINT;
    });
    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    describe("apiVersion()", function () {
        it("Returns an API version of 1 for Insight 4", function () {
            spyOn(insight, "getVersion").and.returnValue(4);
            project._init();
            expect(project.apiVersion()).toEqual(1);
        });
        it("Returns an API version of 2 for Insight 5", function () {
            spyOn(insight, "getVersion").and.returnValue(5);
            project._init();
            expect(project.apiVersion()).toEqual(2);
        });
    })
    describe('refreshProjectList()', function () {
        it("Should call through to _getProjects", function () {
            spyOn(project, "_getProjects");
            project.refreshProjectList();
            expect(project._getProjects).toHaveBeenCalled();
        });
    });
    describe('CreateProject()', function () {
        it("Should create a project with the supplied name", function (done) {
            spyOn(project, "_createProject").and.returnValue(Promise.resolve());
            spyOn(project.dom, "showConfirmationDialog");

            var newName = "abc123  ";
            project.createProject(newName)
                .then(() => {
                    expect(project._createProject).toHaveBeenCalledWith(newName.trim());
                    done();
                });
        });
        it("Should ask the user for a name if one isnt supplied", function () {
            spyOn(project, "_createProject");
            spyOn(project.dom, "showConfirmationDialog");

            project.createProject(null)
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "create", "Create Project", "", "", jasmine.any(Function), "");
        });
    });
    describe('exportProject()', function () {
        var folder = {
            id: "1234",
            name: "a project"
        };

        it("Should open the confirmation dialog", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project.dom, "showConfirmationDialog");
            project.exportProject(folder.id);
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith(
                $("body"),
                "export",
                "Export Project",
                "Are you sure you wish to export this project?",
                'This action will export the project settings and all scenarios.',
                jasmine.any(Function)
            );
        });
    });
    describe('openProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        it("Should open an existing project", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project, "_moveToProject");

            project.openProject()
                .then(function () {
                    expect(project._moveToProject).toHaveBeenCalledWith(existingProjectScenario);
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if the project scenario doesnt exist", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.reject());
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);

            project.openProject()
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to open project "existing project".');
                    done();
                });
        });
    });
    describe('renameProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        it("Should open the rename dialog for an existing project", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");

            project.renameProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "rename", "Rename Project", "", "", jasmine.any(Function), existingFolder.name);
        });
    });
    describe('deleteProject()', function () {
        it("Should open the delete dialog for an existing project", function () {
            spyOn(project.dom, "showConfirmationDialog");

            project.deleteProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "delete", "Delete Project", "Are you sure you wish to delete this project?", "This operation cannot be undone.", jasmine.any(Function));
        });
    });
    describe('cloneProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        it("Should open the clone dialog for an existing project", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");

            project.cloneProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "clone", "Clone Project", "", 'Clone Project will clone the project settings only. If you wish to clone your scenarios as well, export the project and then re-import it.', jasmine.any(Function), existingFolder.name + " - copy");
        });

    });
    describe('importProject()', function () {
        var newFolder =
            {
                id: 'new-folder-id',
                name: 'new project',
                objectType: 'FOLDER'
            };

        var newProjectScenario =
            {
                id: 'test-scenario-id',
                name: 'new project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: newFolder
            };

        var newProjectName = "new project";

        it("Should fail on an invalid project name", function (done) {
            spyOn(project, "_validateProjectName").and.returnValue(false);

            project.importProject(newProjectName)
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(('\"' + newProjectName + '\" is not a valid name for a project.'));
                    done();
                });
        });
        it("Should import the project and open the default view", function (done) {
            spyOn(project, "newProjectName").and.returnValue(newProjectName);
            spyOn(project, "_validateProjectName").and.returnValue(true);
            spyOn(insight, "openView");
            spyOn(project, "_importProject").and.returnValue(Promise.resolve(true));
            var origin = "UPLOAD";
            project.importProject(newProjectName, origin)
                .then(function () {
                    expect(project._importProject).toHaveBeenCalledWith(newProjectName, origin);
                    done();
                })
                .catch(done.fail);
        });
    });
    describe("goToManageView()", function () {
        it("Should call through to insight.openView", function () {
            spyOn(insight, "openView");
            project.goToManageView();
            expect(insight.openView).toHaveBeenCalledWith(project.config.manageView);
        });
    });
    describe('validateShelf()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project, "_validateForScenarioPage");
            spyOn(project, "_validateForProjectPage");
        });

        it("Should call _validateForScenarioPage for scenario view", function () {
            project.validateShelf("scenario", [1, 2, 3]);
            expect(project._validateForScenarioPage).toHaveBeenCalledWith([1, 2, 3]);
        });
        it("Should call _validateForProjectPage for scenario view", function () {
            project.validateShelf("project", [1, 2, 3]);
            expect(project._validateForProjectPage).toHaveBeenCalledWith([1, 2, 3]);
        });
        it("Should do nothing for an unrecognised page type", function () {
            project.validateShelf("unknown", [1, 2, 3]);
            expect(project._validateForScenarioPage).not.toHaveBeenCalled();
            expect(project._validateForProjectPage).not.toHaveBeenCalled();
        });
    });
    describe('shareProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.dom, "showConfirmationDialog");
            spyOn(project, "currentProjectFolders").and.returnValue([existingFolder]);
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
        });

        it("Should correctly identify an existing project shared PRIVATE", function (done) {
            existingFolder.shareStatus = "PRIVATE";
            existingProjectScenario.shareStatus = "PRIVATE";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "share", "Share Project", "", "", jasmine.any(Function), "SHARE_PRIVATE");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_READONLY", function (done) {
            existingFolder.shareStatus = "READONLY";
            existingProjectScenario.shareStatus = "READONLY";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "share", "Share Project", "", "", jasmine.any(Function), "SHARE_READONLY");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_PROJECTREADONLY", function (done) {
            existingFolder.shareStatus = "FULLACCESS";
            existingProjectScenario.shareStatus = "READONLY";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "share", "Share Project", "", "", jasmine.any(Function), "SHARE_PROJECTREADONLY");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_FULL", function (done) {
            existingFolder.shareStatus = "FULLACCESS";
            existingProjectScenario.shareStatus = "FULLACCESS";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith($("body"), "share", "Share Project", "", "", jasmine.any(Function), "SHARE_FULL");
                    done();
                })
                .catch(done.fail);
        });
        it("Should not show an error for an invalid project share status", function (done) {
            existingFolder.shareStatus = "PRIVATE";
            existingProjectScenario.shareStatus = "FULLACCESS";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.view.showErrorMessage).not.toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });

    });
    describe('_getProjects()', function () {
        var successResponse = {
            status: 200,
            responseText: JSON.stringify({items: rootChildren_v4})
        };

        it("Should get the list of existing project folders with V1 interface", function (done) {
            var spy = spyOn(project, "currentProjectFolders");
            spyOn(project.app, "getUsers").and.returnValue(Promise.resolve(users_v4));
            spyOn(project.api, "getVersion").and.returnValue(1);
            spyOn(project.api, "getProjects").and.returnValue(Promise.resolve([_.cloneDeep(rootChildren_v4[0]), _.cloneDeep(rootChildren_v4[2])]));

            project._getProjects()
                .then(function (response) {
                    expect(project.api.getProjects).toHaveBeenCalledWith(project.appId);

                    // mock up the user name resolution
                    response[0].owner = {name: "Administrator User"};
                    response[1].owner = {name: "Administrator User"};

                    expect(spy.calls.all()[0].args[0]).toEqual([]);
                    expect(spy.calls.all()[1].args[0]).toEqual(response);
                    done();
                })
                .catch(done.fail)
        });
        it("Should get the list of existing project folders with V2 interface", function (done) {
            var spy = spyOn(project, "currentProjectFolders");
            spyOn(project.api, "getVersion").and.returnValue(2);
            spyOn(project.api, "getProjects").and.returnValue(Promise.resolve([_.cloneDeep(rootChildren[0]), _.cloneDeep(rootChildren[2])]));

            project._getProjects()
                .then(function (response) {
                    expect(project.api.getProjects).toHaveBeenCalledWith(project.appId);

                    // mock up the expected user name resolution
                    response[0].owner = {name: "Administrator User"};
                    response[1].owner = {name: "Administrator User"};

                    expect(spy.calls.all()[0].args[0]).toEqual([]);
                    expect(spy.calls.all()[1].args[0]).toEqual(response);
                    done();
                })
                .catch(done.fail)
        });
        it("Should show an error when it fails to get the list of folders", function (done) {
            spyOn(project.api, "getProjects").and.returnValue(Promise.reject());

            project._getProjects()
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Unexpected error fetching projects list');
                    done();
                })
        });
        it("Should augment the project information with the configured entities", function (done) {
            var entities = {
                'attrib1': 123,
                'attrib2': 456
            }

            var spy = spyOn(project, "currentProjectFolders");
            spyOn(project.api, "getVersion").and.returnValue(2);
            spyOn(project.api, "getProjects").and.returnValue(Promise.resolve(_.cloneDeep(projects)));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenarios[0]));
            spyOn(project.api, "getScenarioEntities").and.returnValue(Promise.resolve(entities));

            project.config.projectAttributes = ["attrib1", "attrib2"];
            project._getProjects()
                .then(function (response) {
                    expect(project.api.getProjects).toHaveBeenCalledWith(project.appId);
                    expect(project._getProjectScenarioForFolder).toHaveBeenCalledWith(projects[0].id);
                    expect(project._getProjectScenarioForFolder).toHaveBeenCalledWith(projects[1].id);
                    expect(response[0].attributes.attrib1).toEqual(entities.attrib1);
                    expect(response[1].attributes.attrib2).toEqual(entities.attrib2);
                    done();
                })
                .catch(done.fail)
        });
    });
    describe('_createProject()', function () {
        var newFolder =
            {
                id: 'new-folder-id',
                name: 'new project',
                objectType: 'FOLDER'
            };

        var newProjectScenario =
            {
                id: 'test-scenario-id',
                name: 'new project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: newFolder
            };

        var newProjectName = "new project";

        beforeEach(function () {
            spyOn(project, "_validateProjectName").and.returnValue(true);
        });

        it("Should fail on an invalid project name", function (done) {
            project._validateProjectName.and.returnValue(false);

            project._createProject(newProjectName)
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(('\"' + newProjectName + '\" is not a valid name for a project.'));
                    done();
                });
        });
        it("Should create and open a new project", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.api, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve(true));
            spyOn(project.view, "setShelf").and.returnValue(Promise.resolve());
            spyOn(insight, "openView").and.returnValue(Promise.resolve());

            project._createProject(newProjectName)
                .then(function () {
                    expect(project.api.createRootFolder).toHaveBeenCalledWith(project.app, newProjectName);
                    expect(project.api.createScenario).toHaveBeenCalledWith(project.app, newFolder, newProjectName, project.config.projectScenarioType);
                    expect(project.view.executeScenario).toHaveBeenCalledWith(newProjectScenario.id, insight.enums.ExecutionType.LOAD, {suppressClearPrompt: true});
                    expect(project.view.setShelf).toHaveBeenCalledWith([newProjectScenario.id]);
                    expect(insight.openView).toHaveBeenCalledWith(project.config.defaultView);
                    done();
                })
                .catch(done.fail);
        });
        it("Should report an error when createRootFolder fails", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.reject());

            project._createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when createScenario fails", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.api, "createScenario").and.returnValue(Promise.reject());

            project._createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when executeScenario fails", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.api, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.reject());

            project._createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when setShelf fails", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.api, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve());
            spyOn(project.view, "setShelf").and.throwError();

            project._createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when openView fails", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.api, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve());
            spyOn(project.view, "setShelf");
            spyOn(insight, "openView").and.throwError();

            project._createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when the project name already exists", function (done) {
            spyOn(project, "currentProjectFolders").and.returnValue(projects);

            project._createProject("test project")
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Cannot create. A project exists with the same name");
                    done(); // expected to fail
                });
        });

    });
    describe('_moveToProject()', function () {
        it("Should add the project scenario to the shelf and open the target view", function () {
            spyOn(project.view, "setShelf");
            spyOn(insight, "openView");
            project._moveToProject({id: "1234"});
            expect(project.view.setShelf).toHaveBeenCalledWith(["1234"]);
            expect(insight.openView).toHaveBeenCalledWith(project.config.defaultView);
        });
    });
    describe('_getProjectScenarioForFolder()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var children =
            [
                {
                    id: 'scenario-id-1',
                    name: 'scenario 1',
                    objectType: 'SCENARIO',
                    scenarioType: 'SCENARIO',
                    parent: existingFolder
                },
                {
                    id: 'project-scenario-id',
                    name: 'existing project',
                    objectType: 'SCENARIO',
                    scenarioType: 'PROJECT',
                    parent: existingFolder
                },
                {
                    id: 'scenario-id-2',
                    name: 'scenario 2',
                    objectType: 'SCENARIO',
                    scenarioType: 'SCENARIO',
                    parent: existingFolder
                }
            ];

        it("Should reject if no folder id specified", function (done) {
            project._getProjectScenarioForFolder(/* undefined */)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('This doesn\'t look like a project folder.');
                    done();
                });
        });
        it("Should resolve to project scenario if project scenario exists for project", function (done) {
            spyOn(project.api, "getChildren").and.returnValue(Promise.resolve([existingProjectScenario]));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(function (projectScenario) {
                    expect(projectScenario).toEqual(existingProjectScenario);
                    done();
                })
                .catch(done.fail);
        });
        it("Should reject if project scenario doesnt exist for project", function (done) {
            spyOn(project.api, "getChildren").and.returnValue(Promise.resolve([]));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('This doesn\'t look like a project folder.');
                    done();
                });
        });
        it("Should resolve to the project scenario if we find it", function (done) {
            spyOn(project.api, "getChildren").and.returnValue(Promise.resolve(children));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(function (projectScenario) {
                    expect(projectScenario).toEqual(children[1]);
                    done();
                })
                .catch(done.fail);
        });
        it("Should reject if we dont find it", function (done) {
            var temp = _.cloneDeep(children);
            temp[1].scenarioType = "SCENARIO"; // no PROJECT type in the array now
            spyOn(project.api, "getChildren").and.returnValue(Promise.resolve(temp));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(done.fail)
                .catch(function () {
                    expect().nothing();
                    done(); // expected to not succeed
                });
        });
        it("Should throw error if the request to list children fails", function (done) {
            spyOn(project.api, "getChildren").and.returnValue(Promise.reject());
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(done.fail)
                .catch(function () {
                    expect().nothing();
                    done(); // expected to not succeed
                });
        });
    });
    describe('_validateProjectName()', function () {
        it("Any non empty string not beginning with underscore is a valid project name", function () {
            expect(project._validateProjectName("abc")).toBeTruthy();
        });
        it("A string beginning with underscore is an invalid project name", function () {
            expect(project._validateProjectName("_abc")).toBeFalsy();
        });
        it("An empty string is an invalid project name", function () {
            expect(project._validateProjectName("")).toBeFalsy();
        });

    });
    describe('_getProjectFolderObject()', function () {
        var existingFolders =
            [{
                id: 'folder-id-1',
                name: 'existing project 1',
                objectType: 'FOLDER'
            },
                {
                    id: 'folder-id-2',
                    name: 'existing project 2',
                    objectType: 'FOLDER'
                }];

        it("Should return project folder if it exists", function () {
            spyOn(project, "currentProjectFolders").and.returnValue(existingFolders);
            expect(project._getProjectFolderObject('folder-id-2')).toEqual(existingFolders[1]);
        });
        it("Should return undefined if it doesnt exist", function () {
            spyOn(project, "currentProjectFolders").and.returnValue(existingFolders);
            expect(project._getProjectFolderObject('not-a-valid-id')).toBeUndefined();
        });

    });
    describe('_cloneFolderAndProjectScenario()', function () {
        var existingProjects = [
            {name: 'existing project 2'},
            {name: 'existing project 3'},
            {name: 'existing project 4'},
        ];

        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var cloneProjectName = "cloned project";
        var clonedFolder =
            {
                id: 'cloned-folder-id',
                name: cloneProjectName,
                objectType: 'FOLDER'
            };
        var clonedProjectScenario =
            {
                id: 'cloned-project-scenario-id',
                name: cloneProjectName,
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: clonedFolder
            };

        beforeEach(function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
        });

        it("Should clone the project to the target name when there isnt already a project called the target name", function (done) {
            spyOn(project, "currentProjectFolders").and.returnValue([]);
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project.api, "cloneScenario").and.returnValue(Promise.resolve(clonedProjectScenario));
            spyOn(project.view, "showInfoMessage");

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(function () {
                    var msg = 'Project "' + existingProjectScenario.name + '" was successfully cloned to project "' + clonedProjectScenario.name + '".';
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith(msg)
                    done();
                })
                .catch(done.fail);
        });
        it("Should clone the project to a decorated target name when there was a naming conflict", function (done) {
            spyOn(project, "currentProjectFolders").and.returnValue([]);
            var nameConflict = _.cloneDeep(clonedFolder);
            nameConflict.name = nameConflict.name + " (1)";
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(nameConflict));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project.api, "cloneScenario").and.returnValue(Promise.resolve(clonedProjectScenario));
            spyOn(project.view, "showInfoMessage");

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(function () {
                    var msg = 'Project "' + existingProjectScenario.name + '" was successfully cloned and named "' + nameConflict.name + '" to avoid a naming conflict.'
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith(msg)
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error message when it fails to clone the project folder", function (done) {
            spyOn(project, "currentProjectFolders").and.returnValue([]);
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.reject());
            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    var msg = 'Failed to clone project \"' + existingFolder.name + '\". No changes were made.';
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(msg);
                    done();
                });
        });
        it("Should fail to clone the project where there is already a project called the target name", function (done) {
            spyOn(project, "currentProjectFolders").and.returnValue(existingProjects);

            project._cloneFolderAndProjectScenario(existingFolder.id, "existing project 3")
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Cannot clone. A project exists with the same name");
                    done();
                });
        });
        it("Should delete the new project folder when it fails to clone the project scenario", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project.api, "cloneScenario").and.returnValue(Promise.reject());
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.resolve());

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(clonedFolder.id);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to clone project "' + existingProjectScenario.name + '". Changes were rolled back.');
                    done();
                });
        });
        it("Should show an error message when it failed to delete the new project folder", function (done) {
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project.api, "cloneScenario").and.returnValue(Promise.reject());
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.reject());
            spyOn(project.view, "showInfoMessage");


            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(clonedFolder.id);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to clone project "' + existingProjectScenario.name + '". A folder for this new project was created, you can delete it using the Scenario Explorer.');
                    done();
                });
        });
        it("Should fail on an invalid project name", function (done) {
            spyOn(project, "_validateProjectName").and.returnValue(false);
            var newProjectName = "an invalid name";
            project._cloneFolderAndProjectScenario("1234", newProjectName)
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(('\"' + newProjectName + '\" is not a valid name for a project.'));
                    done();
                });
        });
    });
    describe('_deleteProject()', function () {
        var existingFolders =
            [
                {
                    id: 'folder-id',
                    name: 'existing project',
                    objectType: 'FOLDER'
                },
                {
                    id: 'folder-id-2',
                    name: 'existing project 2',
                    objectType: 'FOLDER'
                }
            ];

        beforeEach(function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolders[0]);
        });

        it("Should delete the project folder, update the folder list and show a message", function (done) {
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.resolve());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_getProjects");

            project._deleteProject(existingFolders[0].id)
                .then(function () {
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(existingFolders[0].id);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project "' + existingFolders[0].name + '" successfully deleted.');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error message when it fails to delete the folder", function (done) {
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.reject());
            spyOn(project.view, "showInfoMessage");

            project._deleteProject(existingFolders[0].id)
                .then(done.fail)
                .catch(function () {
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(existingFolders[0].id);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to delete project "' + existingFolders[0].name + '". No changes have been made.');
                    done();
                });
        });
    });
    describe('_exportProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        it("Should show message and commence file download for V1 interface", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");
            spyOn(project.dom, "downloadFile");
            spyOn(project.view, "showInfoMessage");

            spyOn(project.api, "getVersion").and.returnValue(1);

            project._exportProject(existingFolder);
            expect(project.view.showInfoMessage).toHaveBeenCalledWith('Exporting project \'' + existingFolder.name + '\'...')
            expect(project.dom.downloadFile).toHaveBeenCalledWith(project.api.BASE_REST_ENDPOINT + 'folder/' + existingFolder.id + '/export');
        });
        it("Should commence file download for V2+ interface", function (done) {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.api, "exportFolder").and.returnValue(Promise.resolve());
            spyOn(project.api, "getVersion").and.returnValue(2);

            project._exportProject(existingFolder)
                .then(function () {
                    expect(project.api.exportFolder).toHaveBeenCalledWith(existingFolder);
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error message if exportfolder fails for the v2 interface", function (done) {
            spyOn(project.api, "getVersion").and.returnValue(2);
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.api, "exportFolder").and.returnValue(Promise.reject());

            project._exportProject(existingFolder)
                .then(function () {
                    expect(project.api.exportFolder).toHaveBeenCalledWith(existingFolder);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to export project \'' + existingFolder.name + '\'');
                    done();
                })
                .catch(done.fail);
        });
    });
    describe('_getModalValue', function () {
        var newName = "  a new name  ";
        var event = {
            target: "XXX"
        };
        var field = {
            val: function () {
                return newName;
            }
        };
        var modal = {
            find: function () {
                return field;
            }
        };
        var element = {
            parents: function () {
                return modal;
            }
        };

        it("Should return the trimmed value of the modal element with the class .dialogValue", function () {
            spyOn(window, "$").and.returnValue(element);
            spyOn(project, "_getModalValue").and.callThrough();
            expect(project._getModalValue(event)).toEqual(newName.trim());
        });
    })
    describe("_handleCreateConfirmation()", function () {
        var children = _.cloneDeep(rootChildren_v4);
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project 1',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: rootChildren_v4[0]
            };
        var newProjectName = "renamed project";

        beforeEach(function () {
            spyOn(project, "_createProject").and.returnValue(Promise.resolve());
        })

        it("should accept a valid new name", function (done) {
            var event = "an event";
            spyOn(project, "_getModalValue").and.returnValue("a new name");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleCreateConfirmation(event)
                .then(function () {
                    expect(project._createProject).toHaveBeenCalledWith("a new name");
                    expect(project.view.showErrorMessage).not.toHaveBeenCalled();
                    done();
                });
        });
        it("should reject a valid new name that is already in use", function (done) {
            spyOn(project, "_getModalValue").and.returnValue("existing project 2");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleCreateConfirmation(event)
                .then(done.fail)
                .catch(function () {
                    expect(project._createProject).not.toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Cannot create. A project exists with the same name");
                    done();
                });
        });
        it("should reject an invalid name", function (done) {
            spyOn(project, "_getModalValue").and.returnValue("_new name");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleCreateConfirmation(children[0])
                .then(done.fail)
                .catch(function () {
                    expect(project._createProject).not.toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('\"' + "_new name" + '\" is not a valid name for a project.');
                    done();
                });
        });
    });
    describe("_handleCloneConfirmation()", function () {
        var projectId = "1234";
        var newName = "new name";
        var event = "an event";

        it("Should call through to _cloneFolderAndProjectScenario()", function () {
            spyOn(project, "_cloneFolderAndProjectScenario");
            spyOn(project, "_getModalValue").and.returnValue(newName);

            project._handleCloneConfirmation(projectId, event);
            expect(project._getModalValue).toHaveBeenCalledWith(event);
            expect(project._cloneFolderAndProjectScenario).toHaveBeenCalledWith(projectId, newName);

        });
    });
    describe("_handleRenameConfirmation()", function () {
        var children = _.cloneDeep(rootChildren_v4);
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project 1',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: rootChildren_v4[0]
            };
        var newProjectName = "renamed project";

        beforeEach(function () {
            spyOn(project, "_renameFolderAndProjectScenario").and.returnValue(Promise.resolve());
        })

        it("should accept a valid new name", function (done) {
            spyOn(project, "_getModalValue").and.returnValue("a new name");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleRenameConfirmation(children[0])
                .then(function () {
                    expect(project._renameFolderAndProjectScenario).toHaveBeenCalled();
                    expect(project.view.showErrorMessage).not.toHaveBeenCalled();
                    done();
                });
        });
        it("should reject a valid new name that is already in use", function (done) {
            spyOn(project, "_getModalValue").and.returnValue("existing project 2");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleRenameConfirmation(children[0])
                .then(done.fail)
                .catch(function () {
                    expect(project._renameFolderAndProjectScenario).not.toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Cannot rename. A project exists with the same name");
                    done();
                });
        });
        it("should reject an invalid name", function (done) {
            spyOn(project, "_getModalValue").and.returnValue("_new name");
            spyOn(project, "currentProjectFolders").and.returnValue(children);
            project._handleRenameConfirmation(children[0])
                .then(done.fail)
                .catch(function () {
                    expect(project._renameFolderAndProjectScenario).not.toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('\"' + "_new name" + '\" is not a valid name for a project.');
                    done();
                });
        });
    });
    describe('_renameFolderAndProjectScenario()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                name: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                name: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var newProjectName = "renamed project";

        it("Should rename existing project folder and scenario, update projects list and show info message", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "renameFolder").and.returnValue(Promise.resolve());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_getProjects");

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(function () {
                    expect(project.api.renameScenario).toHaveBeenCalledWith(existingProjectScenario.id, newProjectName);
                    expect(project.api.renameFolder).toHaveBeenCalledWith(existingFolder.id, newProjectName);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project successfully renamed from "' + existingFolder.name + '" to "' + newProjectName + '".');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if the project scenario cant be located", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.reject());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project. Action rolled back.");
                    done();
                });
        });
        it("Should show an error if renaming the project scenario fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.reject());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project. Action rolled back.");
                    done();
                });
        });
        it("Should show an error and rollback the project scenario if renaming the project folder fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            var spy = spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "renameFolder").and.returnValue(Promise.reject());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    // first time to rename current->new
                    expect(spy.calls.all()[0].args[0]).toEqual(existingProjectScenario.id);
                    expect(spy.calls.all()[0].args[1]).toEqual(newProjectName);
                    // second time to revert new->current
                    expect(spy.calls.all()[1].args[0]).toEqual(existingProjectScenario.id);
                    expect(spy.calls.all()[1].args[1]).toEqual(existingProjectScenario.name);

                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project. Action rolled back.");
                    done();
                });
        });
        it("Should show an error if it fails to rollback", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            var spy = spyOn(project.api, "renameScenario").and.returnValues(Promise.resolve(), Promise.reject());
            spyOn(project.api, "renameFolder").and.returnValue(Promise.reject());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    // first time to rename current->new
                    expect(spy.calls.all()[0].args[0]).toEqual(existingProjectScenario.id);
                    expect(spy.calls.all()[0].args[1]).toEqual(newProjectName);
                    // second time to revert new->current
                    expect(spy.calls.all()[1].args[0]).toEqual(existingProjectScenario.id);
                    expect(spy.calls.all()[1].args[1]).toEqual(existingProjectScenario.name);

                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project folder but could not roll back action. To correct this error state please rename your project again.");
                    done();
                });
        });
    });
    describe('_importProject()', function () {
        var workingFolder = {
            id: "import-target-id",
            name: "importProject_1234",
            objectType: "FOLDER",
            url: "url//"
        };
        var importFolders = [
            {
                id: "project-folder-id",
                name: "project 1",
                objectType: "FOLDER",
                url: "url//",
                parent: workingFolder
            }
        ];
        var importScenarios = [
            {
                id: "project-scenario-id",
                name: "project 1",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                url: "url//",
                parent: importFolders[0]
            }
        ];
        var desiredProjectName = "imported project";
        var workingFolderName = "projectImport_1234";
        var importResponse = {
            response: {
                status: 200,
                scenarios: {
                    items: importScenarios
                },
                folders: {
                    items: importFolders
                }
            },
            folder: workingFolder
        };
        var files = [
            {
                name: "upload1",
                size: "1234"
            }
        ];

        it("Should orchestrate the browser import of the project", function (done) {
            var origin = "UPLOAD";

            spyOn(project.dom, "promptFileUpload").and.returnValue(Promise.resolve(files));
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.api, "uploadImportFile").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.resolve(importScenarios[0]));
            spyOn(project, "_cleanupWorkingFolder").and.returnValue(Promise.resolve());
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project.dom, "trigger").and.callThrough();
            spyOn(project, "_moveToProject");
            spyOn(project.view, "showInfoMessage");
            project.importOverlayDelay = 0;

            project._importProject(desiredProjectName, origin)
                .then(function () {
                    expect(project.dom.promptFileUpload).toHaveBeenCalled();
                    expect(project.api.createRootFolder).toHaveBeenCalledWith(project.app, workingFolderName);
                    expect(project.api.uploadImportFile).toHaveBeenCalledWith(workingFolder, files);
                    expect(project._handleImportedProject).toHaveBeenCalledWith(desiredProjectName, workingFolder, importResponse);
                    expect(project.dom.trigger.calls.first().args).toEqual(['project.overlay.show', 'Importing Project']);
                    expect(project._cleanupWorkingFolder).toHaveBeenCalledWith(workingFolder.id);
                    // make sure the last change was a hide
                    expect(project.dom.trigger.calls.mostRecent().args).toEqual(['project.overlay.hide']);
                    expect(project._moveToProject).toHaveBeenCalledWith(importScenarios[0]);
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project imported successfully as "' + importScenarios[0].name + '"');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if anything went wrong during the browser import", function (done) {
            var origin = "UPLOAD";

            var errormsg = "Error during project import. The imported file does not contain a project scenario";
            spyOn(project.dom, "promptFileUpload").and.returnValue(Promise.resolve(files));
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.api, "uploadImportFile").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.reject(errormsg));
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project.dom, "trigger").and.callThrough();
            spyOn(project, "_handleUpgradeErrors").and.callThrough();
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.resolve());

            project._importProject(desiredProjectName, origin)
                .then(done.fail)
                .catch(function () {
                    expect(project.dom.trigger.calls.first().args).toEqual(['project.overlay.show', 'Importing Project']);
                    expect(project.dom.trigger.calls.mostRecent().args).toEqual(['project.overlay.hide']);
                    expect(project._handleUpgradeErrors).toHaveBeenCalledWith(workingFolder.id, errormsg);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(errormsg);
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(workingFolder.id);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('The import was rolled back.');
                    done();
                });
        });
        it("Should orchestrate the server import of the project", function (done) {
            var origin = "SERVER";

            // reboot into insight 5 mode to get server import capability
            spyOn(insight, "getVersion").and.returnValue(5);
            project._init();

            var portationId = 9876;

            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.view, "importFromServer").and.returnValue(Promise.resolve(portationId));
            spyOn(project.api, "waitForUpload").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.resolve(importScenarios[0]));
            spyOn(project, "_cleanupWorkingFolder").and.returnValue(Promise.resolve());
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project.dom, "trigger").and.callThrough();
            spyOn(project, "_moveToProject");
            spyOn(project.view, "showInfoMessage");
            project.importOverlayDelay = 0;

            project._importProject(desiredProjectName, origin)
                .then(function () {
                    expect(project.api.createRootFolder).toHaveBeenCalledWith(project.app, workingFolderName);
                    expect(project.view.importFromServer).toHaveBeenCalledWith(workingFolder.id, "FOLDER");
                    expect(project.api.waitForUpload).toHaveBeenCalledWith(portationId);
                    expect(project._handleImportedProject).toHaveBeenCalledWith(desiredProjectName, workingFolder, importResponse);
                    expect(project._cleanupWorkingFolder).toHaveBeenCalledWith(workingFolder.id);
                    expect(project._moveToProject).toHaveBeenCalledWith(importScenarios[0]);
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project imported successfully as "' + importScenarios[0].name + '"');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if anything went wrong during the server import", function (done) {
            var origin = "SERVER";

            // reboot into insight 5 mode to get server import capability
            spyOn(insight, "getVersion").and.returnValue(5);
            project._init();

            var portationId = 9876;

            var errormsg = "Error during project import. The imported file does not contain a project scenario";
            spyOn(project.api, "createRootFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.view, "importFromServer").and.returnValue(Promise.resolve(portationId));
            spyOn(project.api, "waitForUpload").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.reject(errormsg));
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project, "_handleUpgradeErrors").and.callThrough();
            spyOn(project.api, "deleteFolder").and.returnValue(Promise.resolve());

            project._importProject(desiredProjectName, origin)
                .then(done.fail)
                .catch(function () {
                    expect(project._handleUpgradeErrors).toHaveBeenCalledWith(workingFolder.id, errormsg);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(errormsg);
                    expect(project.api.deleteFolder).toHaveBeenCalledWith(workingFolder.id);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('The import was rolled back.');
                    done();
                });
        });
    });
    describe('_handleImportedProject()', function () {
        var workingFolder = {
            id: "import-target-id",
            name: "importProject_1234",
            objectType: "FOLDER",
            url: "url//"
        };
        var importFolders = [
            {
                id: "project-folder-id",
                name: "project 1",
                objectType: "FOLDER",
                url: "url//",
                parent: workingFolder
            }
        ];
        var importScenarios = [
            {
                id: "project-scenario-id",
                name: "project 1",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                url: "url//",
                parent: importFolders[0]
            }
        ];
        var desiredProjectName = "imported project";
        var workingFolderName = "importProject_1234";
        var importResponse = {
            scenarios: importScenarios,
            folders: importFolders
        };

        it("Should handle the imported folder if the import contents are valid", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());

            project._handleImportedProject(desiredProjectName, workingFolder, importResponse)
                .then(function () {
                    expect(project._handleImportedFolder).toHaveBeenCalledWith(importFolders[0], importScenarios[0], desiredProjectName);
                    done();
                })
                .catch(done.fail);
        });
        it("Should return an error if the import doesnt contain a project scenario", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            tempResponse.scenarios[0].scenarioType = "NOTAPROJECT";

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Error during project import. The imported file does not contain a project scenario");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
        it("Should return an error if the import contains multiple project scenarios", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            // duplicate so there are 2 project scenarios
            tempResponse.scenarios.push(tempResponse.scenarios[0]);

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Error during project import. The imported file contains more than 1 project scenario");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
        it("Should return an error if the import doesnt contain a project folder", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            tempResponse.folders = [];

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Error during project import. The imported file does not contain a project folder");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
        it("Should return an error if the import contains multiple project folders", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            // duplicate so there are 2 project folders
            tempResponse.folders.push(tempResponse.folders[0]);

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Error during project import. The imported file contains more than one project folder");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
    });
    describe('_handleUpgradeErrors()', function () {
        it("Should show an error message and resolve to reject if we didnt get as far as creating a working folder", function (done) {
            project._handleUpgradeErrors(null, "the reason")
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("the reason");
                    done();
                });
        });
    });
    describe('_handleImportedFolder()', function () {
        var desiredProjectName = "imported project";
        var workingFolder = {
            id: "1234",
            name: "importProject_1234",
            objectType: "FOLDER"
        };
        var newProjectFolder = {
            id: "1234",
            name: desiredProjectName,
            objectType: "FOLDER"
        };
        var newProjectFolderDecorated = {
            id: "1234",
            name: desiredProjectName + " (1)",
            objectType: "FOLDER"
        };
        var importScenario =
            {
                id: "5678",
                name: "project 1",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                parent: newProjectFolder
            };

        it("Moves folder to tbe root and renames to desired project name", function (done) {
            spyOn(project.api, "renameFolder").and.returnValue(Promise.resolve());
            spyOn(project.api, "moveFolderToRoot").and.returnValue(Promise.resolve(_.cloneDeep(newProjectFolderDecorated)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());

            project._handleImportedFolder(_.cloneDeep(workingFolder), _.cloneDeep(importScenario), desiredProjectName)
                .then(function (scenario) {
                    expect(project.api.renameFolder).toHaveBeenCalledWith(workingFolder.id, desiredProjectName);
                    expect(project.api.moveFolderToRoot).toHaveBeenCalledWith(project.appId, newProjectFolder);
                    expect(project.api.renameScenario).toHaveBeenCalledWith(importScenario.id, newProjectFolderDecorated.name);
                    expect(scenario.name).toEqual(newProjectFolderDecorated.name);
                    done();
                })
                .catch(function () {
                    fail();
                });
        });
        it("Moves folder to tbe root and handles the desired project name being decorated", function (done) {
            spyOn(project.api, "renameFolder").and.returnValue(Promise.resolve());
            spyOn(project.api, "moveFolderToRoot").and.returnValue(Promise.resolve(_.cloneDeep(newProjectFolder)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());

            project._handleImportedFolder(_.cloneDeep(workingFolder), _.cloneDeep(importScenario), desiredProjectName)
                .then(function (scenario) {
                    expect(project.api.renameFolder).toHaveBeenCalledWith(workingFolder.id, desiredProjectName);
                    expect(project.api.moveFolderToRoot).toHaveBeenCalledWith(project.appId, newProjectFolder);
                    expect(project.api.renameScenario).toHaveBeenCalledWith(importScenario.id, newProjectFolder.name);
                    expect(scenario.name).toEqual(desiredProjectName);
                    done();
                })
                .catch(function () {
                    fail();
                });
        });
        it("Shows error message if it fails to rename the folder", function (done) {
            spyOn(project.api, "renameFolder").and.returnValue(Promise.reject());
            spyOn(project.api, "moveFolderToRoot").and.returnValue(Promise.resolve(_.cloneDeep(newProjectFolder)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());

            project._handleImportedFolder(_.cloneDeep(workingFolder), _.cloneDeep(importScenario), desiredProjectName)
                .then(function (scenario) {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the imported project to " + desiredProjectName);
                    done();
                });
        });
        it("Shows error message if it fails to move the folder", function (done) {
            spyOn(project.api, "renameFolder").and.returnValue(Promise.resolve());
            spyOn(project.api, "moveFolderToRoot").and.returnValue(Promise.reject());
            spyOn(project.api, "renameScenario").and.returnValue(Promise.resolve());

            project._handleImportedFolder(_.cloneDeep(workingFolder), _.cloneDeep(importScenario), desiredProjectName)
                .then(function (scenario) {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the imported project to " + desiredProjectName);
                    done();
                });
        });
        it("Shows error message if it fails to rename the scenario", function (done) {
            spyOn(project.api, "renameFolder").and.returnValue(Promise.resolve());
            spyOn(project.api, "moveFolderToRoot").and.returnValue(Promise.resolve(_.cloneDeep(newProjectFolder)));
            spyOn(project.api, "renameScenario").and.returnValue(Promise.reject());

            project._handleImportedFolder(_.cloneDeep(workingFolder), _.cloneDeep(importScenario), desiredProjectName)
                .then(function (scenario) {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the imported project to " + desiredProjectName);
                    done();
                });
        });
    })
    describe("_init()", function () {
        it("Should set up subscriptions and register custom overlay extension", function () {
            spyOn(project.currentProjectFolders, "subscribe");
            spyOn(window, "VDL");
            spyOn(project, "shelfValid").and.returnValue(true);

            project._init();

            expect(project._initShelfValidation).toHaveBeenCalled();
            expect(window.VDL).toHaveBeenCalled();
            expect(window.VDL.calls.all()[0].args[0]).toEqual('project-overlay');
            var config = window.VDL.calls.all()[0].args[1];
            expect(config.tag).toEqual("project-overlay");
            expect($(config.template).find(".project-loading-img").length).toEqual(1);
            config.createViewModel();
        });
        it("Should get list of existing projects for a management view type", function () {
            spyOn(project.currentProjectFolders, "subscribe");
            spyOn(project, "_getProjects");
            spyOn(window, "VDL");
            spyOn(project, "shelfValid").and.returnValue(true);
            spyOn(project.view, "getScenarioIds").and.returnValue([]);

            project.config.viewType = "manage";
            project._init();

            expect(project._getProjects).toHaveBeenCalled();
            expect(project._initShelfValidation).toHaveBeenCalled();
            expect(window.VDL).toHaveBeenCalled();
        });
        it("Should clear the shelf for a management view type", function () {
            spyOn(project.currentProjectFolders, "subscribe");
            spyOn(project, "_getProjects");
            spyOn(window, "VDL");
            spyOn(project, "shelfValid").and.returnValue(true);
            spyOn(project.view, "getScenarioIds").and.returnValue([1234]);
            spyOn(project.view, "setShelf");

            project.config.viewType = "manage";
            project._init();

            expect(project.view.setShelf).toHaveBeenCalledWith([]);
        });
    });
    describe('_validateForProjectPage()', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function () {
                    return this._props.name;
                },
                getPath: function () {
                    return this._props.path;
                },
                getScenarioType: function () {
                    return this._props.scenarioType;
                },
                getScalar: function (name) {
                    return this._entities[name];
                }
            };
        };
        // a shelf is legal for a project page if it has
        // one project scenario
        // project scenario in position zero
        // all scenarios belong to the project
        it("A single project scenario is valid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"})
            ];
            var message = project._validateForProjectPage(scenarios);
            expect(message).toBe("");
        });
        it("A single project scenario followed by one or more scenarios is valid", function () {
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"})
            ];
            var message = project._validateForProjectPage(scenarios);
            expect(message).toBe("");
        });
        it("No project scenario is invalid", function () {
            var scenarios = [
                //scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"})
            ];
            var message = project._validateForProjectPage(scenarios);
            expect(message).toBe('There is no active project. Please return to the Manage Projects page and create or open a project.');
        });
        it("2 project scenarios is invalid", function () {
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }),
                scenario({
                    name: "project 2",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 2/project 2"
                }),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"})
            ];
            var invalidProjects = [scenarios[0].getName(), scenarios[1].getName()];
            var message = project._validateForProjectPage(scenarios);
            expect(message).toBe('You have added the following project' + ((invalidProjects.length > 1) ? 's' : '') + ' to the shelf: "' + invalidProjects.join('", "') + '". Please ensure that you only have one project scenario and that it is in the first position.');
        });
        it("A project not at the start of the shelf is invalid", function () {
            var scenarios = [
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}),
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                })
            ];
            var message = project._validateForProjectPage(scenarios);
            var foundProjectDetails = scenarios[1];
            expect(message).toBe('Project "' + foundProjectDetails.getName() + '" is not in the correct shelf position. Please place it into the first position on the shelf.');
        });
        it("A scenario that doesnt belong to the project invalid", function () {
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 2/scenario 1"})
            ];

            var message = project._validateForProjectPage(scenarios);
            var foundProjectDetails = scenarios[0];
            var invalidScenarios = [scenarios[2].getName()];
            expect(message).toBe('There are scenarios from different projects other than "' + foundProjectDetails.getName() + '" on the shelf. Please remove the following scenario' + ((invalidScenarios.length > 1) ? 's: ' : ': "') + invalidScenarios.join('", "') + '".');
        });
    });
    describe('_validateForScenarioPage()', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function () {
                    return this._props.name;
                },
                getPath: function () {
                    return this._props.path;
                },
                getScenarioType: function () {
                    return this._props.scenarioType;
                },
                getScalar: function (name) {
                    return this._entities[name];
                }
            };
        };

        // a shelf is legal if its legal for a project page
        // except that it needs at least one scenario that isnt the project and of the required type

        it("Not a valid scenario page if its not a valid project page", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project scenario/scenario 1"})
            ];
            spyOn(project, "_validateForProjectPage").and.returnValue("invalid");
            expect(project._validateForScenarioPage(scenarios)).toEqual("invalid");
        });

        it("One not-project scenario is valid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project scenario/scenario 1"})
            ];
            spyOn(project, "_validateForProjectPage").and.returnValue("");
            expect(project._validateForScenarioPage(scenarios)).toBeFalsy(); // false  = no validation errors
        });
        it("One scenario of a specified required type is valid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"}),
                scenario({name: "scenario 1", scenarioType: "REQUIRED", path: "/myapp/project scenario/scenario 1"})
            ];
            var requiredType = "REQUIRED";

            spyOn(project, "_validateForProjectPage").and.returnValue("");
            expect(project._validateForScenarioPage(scenarios, requiredType)).toBeFalsy(); // false  = no validation errors
        });
        it("Zero scenarios of a specified required type is invalid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "NOTTHERIGHTTYPE",
                    path: "/myapp/project scenario/scenario 1"
                })
            ];
            var requiredType = "REQUIRED";

            spyOn(project, "_validateForProjectPage").and.returnValue("");
            var message = project._validateForScenarioPage(scenarios, requiredType);
            expect(message).toBe('To view this information please create a new scenario or select an existing scenario of the required type by clicking on the grey scenario shelf above.');
        });
        it("More than one of the required type is valid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"}),
                scenario({name: "scenario 1", scenarioType: "REQUIRED", path: "/myapp/project scenario/scenario 1"}),
                scenario({name: "scenario 2", scenarioType: "REQUIRED", path: "/myapp/project scenario/scenario 2"})
            ];
            var requiredType = "REQUIRED";

            spyOn(project, "_validateForProjectPage").and.returnValue("");
            expect(project._validateForScenarioPage(scenarios, requiredType)).toBeFalsy(); // false  = no validation errors
        });
        it("A single project scenario is invalid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"})
            ];
            spyOn(project, "_validateForProjectPage").and.returnValue("");
            var message = project._validateForScenarioPage(scenarios);
            expect(message).toBe('This view requires at least one scenario to be selected. Create a new scenario or select an existing scenario by clicking on the grey scenario shelf above.');
        });
    });
    describe('_initShelfValidation', function () {
        it("Shall set shelfValid to false for an empty shelf", function () {
            project._initShelfValidation.and.callThrough();
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            spyOn(project, "shelfValid");
            spyOn(project, "shelfValidationMessage");
            project._initShelfValidation();
            expect(project.shelfValid).toHaveBeenCalledWith(false);
        });
        it("Shall validate shelf for a project view if the config describes the view as a project view", function () {
            project._initShelfValidation.and.callThrough();
            spyOn(project, "shelfValid");
            spyOn(project.view, "getScenarioIds").and.returnValue([1, 2, 3]);
            project.config.viewType = "project";
            spyOn(project, "validateShelf");
            project._initShelfValidation();
            expect(project.validateShelf.calls.all()[0].args[0]).toEqual("project");
            expect(project.shelfValid).toHaveBeenCalledWith(true);
        });
        it("Shall validate shelf for a scenario view if the config describes the view as a scenario view", function () {
            project._initShelfValidation.and.callThrough(); // override beforeAll spy behaviour
            spyOn(project, "shelfValid");
            spyOn(project.view, "getScenarioIds").and.returnValue([1, 2, 3]);
            project.config.viewType = "scenario";
            spyOn(project, "validateShelf");
            project._initShelfValidation();
            expect(project.validateShelf.calls.all()[0].args[0]).toEqual("scenario");
            expect(project.shelfValid).toHaveBeenCalledWith(true);
        });
        it("Shall show a message and return false if the shelf is invalid", function () {
            project._initShelfValidation.and.callThrough(); // override beforeAll spy behaviour
            spyOn(project, "shelfValid");
            spyOn(project, "shelfValidationMessage");
            spyOn(project.view, "getScenarioIds").and.returnValue([1, 2, 3]);
            project.config.viewType = "scenario";
            spyOn(project, "validateShelf").and.returnValue("failed");
            project._initShelfValidation();
            expect(project.shelfValid).toHaveBeenCalledWith(false);
            expect(project.shelfValidationMessage).toHaveBeenCalledWith({text: "failed"});
        });
    });
    describe('_initProjectRevisionTracking()', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function () {
                    return this._props.name;
                },
                getPath: function () {
                    return this._props.path;
                },
                getScenarioType: function () {
                    return this._props.scenarioType;
                },
                getScalar: function (name) {
                    return this._entities[name];
                }
            };
        };

        beforeEach(function () {
            project._initProjectRevisionTracking.and.callThrough();
            spyOn(project.view.withFirstScenario().withEntities().notify(), "start");
            spyOn(project.view.withFirstScenario().withEntities(), "notify").and.callThrough();
            spyOn(project.view.withFirstScenario(), "withEntities").and.callThrough();
            spyOn(project.schema, "getAllEntities").and.returnValue(["a", "b", "c"]);
        })
        it("should use all entities if 'all' is specified", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            spyOn(project, "_handleProjectEntityChangeNotification");
            project.config.projectEntities = "all";
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).toHaveBeenCalledWith(["a", "b", "c"].concat([project.config.projectRevisionEntity]));
            expect(project.view.withFirstScenario().withEntities().notify).toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).toHaveBeenCalled();
        });
        it("should use the user list of entities if supplied", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            spyOn(project, "_handleProjectEntityChangeNotification");
            project.config.projectEntities = ["x", "y", "z"];
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).toHaveBeenCalledWith(["x", "y", "z"].concat([project.config.projectRevisionEntity]));
            expect(project.view.withFirstScenario().withEntities().notify).toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).toHaveBeenCalled();
        });
        it("should do nothing if no entities supplied", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            spyOn(project, "_handleProjectEntityChangeNotification");

            project.config.projectEntities = [];
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).not.toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify).not.toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).not.toHaveBeenCalled();
        });
        it("should observe revision changes if there is something on the shelf", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue(["1234"]);
            project.config.projectEntities = [];
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).toHaveBeenCalledWith([project.config.projectRevisionEntity]);
            expect(project.view.withFirstScenario().withEntities().notify).toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).toHaveBeenCalled();
        });
        it("should not observe revision changes if there is nothing on the shelf", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            project.config.projectEntities = [];
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).not.toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify).not.toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).not.toHaveBeenCalled();
        });
    });
    describe('_handleProjectRevisionChangeNotification()', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function () {
                    return this._props.name;
                },
                getPath: function () {
                    return this._props.path;
                },
                getScenarioType: function () {
                    return this._props.scenarioType;
                },
                getScalar: function (name) {
                    return this._entities[name];
                },
                modify: function () {
                    return this._dataChange;
                },
                _dataChange: {
                    setScalar: function () {
                    },
                    commit: function () {
                    }
                }
            };
        };

        it("should return a message if one or more scenarios are a different revision to the project", function () {
            project.projectRevision = 10;
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 2",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 2"
                }, {"ProjectRevision": 10})
            ];

            spyOn(project, "projectRevisionMessage");
            project._handleProjectRevisionChangeNotification(scenarios);
            expect(project.projectRevisionMessage).toHaveBeenCalledWith("The project configuration has changed since the following scenarios were executed: " + scenarios[2].getName());

        });
        it("should not return a message if the scenarios are the same revision as the project", function () {
            project.projectRevision = 10;
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 2",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 2"
                }, {"ProjectRevision": 11})
            ];

            spyOn(project, "projectRevisionMessage");
            project._handleProjectRevisionChangeNotification(scenarios);
            expect(project.projectRevisionMessage).toHaveBeenCalledWith(undefined);

        });
    });
    describe('_handleProjectEntityChangeNotification()', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function () {
                    return this._props.name;
                },
                getPath: function () {
                    return this._props.path;
                },
                getScenarioType: function () {
                    return this._props.scenarioType;
                },
                getScalar: function (name) {
                    return this._entities[name];
                },
                modify: function () {
                    return this._dataChange;
                },
                isEditable: function() { return true; },
                _dataChange: {
                    setScalar: function () {
                    },
                    commit: function () {
                    }
                }
            };
        };

        it("should capture the current revision value on init", function () {
            project.projectRevision = 0;
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 2",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 2"
                }, {"ProjectRevision": 10})
            ];

            project._handleProjectEntityChangeNotification(scenarios[0]);
            expect(project.projectRevision).toEqual(scenarios[0].getScalar("ProjectRevision"));
        });
        it("should update the stored project revision if its out of date", function () {
            project.projectRevision = 10;
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 2",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 2"
                }, {"ProjectRevision": 11})
            ];

            project._handleProjectEntityChangeNotification(scenarios[0]);
            expect(project.projectRevision).toEqual(scenarios[0].getScalar("ProjectRevision"));
        });
        it("should increment the revision if tracked entities have changed", function () {
            project.projectRevision = 11;
            var previousValue = project.projectRevision;
            var scenarios = [
                scenario({
                    name: "project 1",
                    scenarioType: project.config.projectScenarioType,
                    path: "/myapp/project 1/project 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 1",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 1"
                }, {"ProjectRevision": 11}),
                scenario({
                    name: "scenario 2",
                    scenarioType: "SCENARIO",
                    path: "/myapp/project 1/scenario 2"
                }, {"ProjectRevision": 11})
            ];
            spyOn(scenarios[0].modify(), "setScalar");
            spyOn(scenarios[0].modify(), "commit");

            project._handleProjectEntityChangeNotification(scenarios[0]);
            expect(project.projectRevision).toEqual(previousValue + 1);
            expect(scenarios[0].modify().setScalar).toHaveBeenCalledWith(project.config.projectRevisionEntity, previousValue + 1);
            expect(scenarios[0].modify().commit).toHaveBeenCalled();
        });
    });
    describe("_handleShareConfirmation()", function () {
        var shareMode = "READONLY";
        var id = "1234";
        var event = {
            originalEvent: {target: "XXX"}
        };
        var field = {
            val: function () {
                return shareMode;
            }
        };
        var modal = {
            find: function () {
                return field;
            }
        };
        var element = {
            parents: function () {
                return modal;
            }
        };

        it("Should call shareProject with the selected share option", function () {
            spyOn(window, "$").and.returnValue(element);
            spyOn(project, "_shareProject");
            project._handleShareConfirmation(id, event);
            expect(project._shareProject).toHaveBeenCalledWith(id, shareMode);
        });
    });
    describe("_shareStatus()", function () {
        var folder = {
            id: "1234",
            shareStatus: "PREVIOUS"
        };
        var scenario = {
            id: "5678",
            shareStatus: "PREVIOUS"
        };

        it("Share project SHARE_PRIVATE => folder PRIVATE, scenario PRIVATE", function (done) {
            var selectedProjectShare = "SHARE_PRIVATE";
            var expectedScenarioShare = "PRIVATE";
            var expectedFolderShare = "PRIVATE";

            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.resolve());
            spyOn(project, "_getProjects");
            spyOn(project.view, "showInfoMessage");

            project._shareProject(folder.id, selectedProjectShare)
                .then(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, expectedScenarioShare);
                    expect(project.api.shareFolder).toHaveBeenCalledWith(folder.id, expectedFolderShare);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project share status updated');

                    done();
                })
                .catch(function () {
                    fail();
                })
        });
        it("Share project SHARE_READONLY => folder READONLY, scenario READONLY", function (done) {
            var selectedProjectShare = "SHARE_READONLY";
            var expectedScenarioShare = "READONLY";
            var expectedFolderShare = "READONLY";

            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.resolve());
            spyOn(project, "_getProjects");
            spyOn(project.view, "showInfoMessage");

            project._shareProject(folder.id, selectedProjectShare)
                .then(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, expectedScenarioShare);
                    expect(project.api.shareFolder).toHaveBeenCalledWith(folder.id, expectedFolderShare);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project share status updated');

                    done();
                })
                .catch(function () {
                    fail();
                })
        });
        it("Share project SHARE_PROJECTREADONLY => folder FULLACCESS, scenario READONLY", function (done) {
            var selectedProjectShare = "SHARE_PROJECTREADONLY";
            var expectedScenarioShare = "READONLY";
            var expectedFolderShare = "FULLACCESS";

            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.resolve());
            spyOn(project, "_getProjects");
            spyOn(project.view, "showInfoMessage");

            project._shareProject(folder.id, selectedProjectShare)
                .then(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, expectedScenarioShare);
                    expect(project.api.shareFolder).toHaveBeenCalledWith(folder.id, expectedFolderShare);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project share status updated');

                    done();
                })
                .catch(function () {
                    fail();
                })
        });
        it("Share project SHARE_FULL => folder FULLACCESS, scenario FULLACCESS", function (done) {
            var selectedProjectShare = "SHARE_FULL";
            var expectedScenarioShare = "FULLACCESS";
            var expectedFolderShare = "FULLACCESS";

            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.resolve());
            spyOn(project, "_getProjects");
            spyOn(project.view, "showInfoMessage");

            project._shareProject(folder.id, selectedProjectShare)
                .then(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, expectedScenarioShare);
                    expect(project.api.shareFolder).toHaveBeenCalledWith(folder.id, expectedFolderShare);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project share status updated');

                    done();
                })
                .catch(function () {
                    fail();
                })
        });
        it("Should show a message if fails to change scenario share status", function (done) {
            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.reject());

            project._shareProject(folder.id, "SHARE_PRIVATE")
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to change the project share status.");
                    done();
                })
        });
        it("Should roll back scenario if failed to set folder share status", function (done) {
            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValue(Promise.resolve());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.reject());

            project._shareProject(folder.id, "SHARE_PRIVATE")
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, "PREVIOUS");
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to change share status for project folder. Action rolled back.");
                    done();
                })
        });
        it("Should show a message if it fails to roll back", function (done) {
            spyOn(project, "_getProjectFolderObject").and.returnValue(folder);
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(scenario));
            spyOn(project.api, "shareScenario").and.returnValues(Promise.resolve(), Promise.reject());
            spyOn(project.api, "shareFolder").and.returnValue(Promise.reject());

            project._shareProject(folder.id, "SHARE_PRIVATE")
                .then(function () {
                    fail();
                })
                .catch(function () {
                    expect(project.api.shareScenario).toHaveBeenCalledWith(scenario.id, "PREVIOUS");
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to change share status for project folder but could not rollback. To correct this error state please set the share status directly.");
                    done();
                })
        });
    })
    describe("_cleanupWorkingFolder()", function () {
        it("Should call deleteFolder to delete the working folder", function () {
            var folder = {
                name: "working folder",
                id: "1234"
            };
            spyOn(project.api, "deleteFolder");
            project._cleanupWorkingFolder(folder);
            expect(project.api.deleteFolder).toHaveBeenCalledWith(folder);
        });
    });
    describe("project.dom tests", function () {
        describe("showConfirmationDialog()", function () {

            it("Should create a dialog", function () {
                var action = "delete";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "1234";
                var container = $("<div>");

                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                // no assertion here but at least make sure called successfully
                project.dom.onEscape();
                expect(project.dom.confirmDialog.modal).toBeDefined();
            });
            it("Should show a create dialog", function () {
                var action = "create";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "";
                var container = $("<div>");

                var dialogSpy = spyOn(bootbox, "dialog").and.callThrough();
                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                var config = dialogSpy.calls.all()[0].args[0];

                expect(config.title).toEqual(title);
                expect(config.message).toMatch(message1);
                expect(config.message).toMatch(message2);
                expect(config.buttons.ok.callback).toEqual(callback);
            });
            it("Should show a share dialog", function () {
                var action = "share";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "SHARE_READONLY";
                var container = $("<div>");

                var dialogSpy = spyOn(bootbox, "dialog").and.callThrough();
                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                var config = dialogSpy.calls.all()[0].args[0];

                expect(config.title).toEqual(title);
                expect(config.message).toMatch(message1);
                expect(config.message).toMatch(message2);
                expect(config.buttons.ok.callback).toEqual(callback);

                expect(container.find('#' + currentValue).prop('checked')).toBeTruthy();
            });
            it("Should show a rename dialog", function () {
                var action = "rename";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "1234";
                var container = $("<div>");

                var dialogSpy = spyOn(bootbox, "dialog").and.callThrough();

                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                var config = dialogSpy.calls.all()[0].args[0];

                expect(config.title).toEqual(title);
                expect(config.message).toMatch(message1);
                expect(config.message).toMatch(message2);
                expect(config.buttons.ok.callback).toEqual(callback);
                expect(container.find('.dialogValue').attr('value')).toEqual(currentValue);
            });
            it("Should show a clone dialog", function () {
                var action = "clone";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "1234";
                var container = $("<div>");

                var dialogSpy = spyOn(bootbox, "dialog").and.callThrough();

                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                container.find('#modal-form').trigger("submit");

                var config = dialogSpy.calls.all()[0].args[0];

                expect(config.title).toEqual(title);
                expect(config.message).toMatch(message1);
                expect(config.message).toMatch(message2);
                expect(config.buttons.ok.callback).toEqual(callback);
                expect(container.find('.dialogValue').attr('value')).toEqual(currentValue);
            });
            it("Should show an export dialog", function () {
                var action = "export";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "";
                var container = $("<div>");

                var dialogSpy = spyOn(bootbox, "dialog").and.callThrough();
                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                var config = dialogSpy.calls.all()[0].args[0];

                expect(config.title).toEqual(title);
                expect(config.message).toMatch(message1);
                expect(config.message).toMatch(message2);
                expect(config.buttons.ok.callback).toEqual(callback);
            })
            it("Should validate the project name on user edit", function () {
                var action = "clone";
                var title = "the title";
                var message1 = "message 1";
                var message2 = "message 2";
                var callback = "callback";
                var currentValue = "1234";
                var container = $("<div>");

                project.dom.showConfirmationDialog(container, action, title, message1, message2, callback, currentValue);
                container.find("input").eq(0).trigger("change");
                // at the start the input field value is valid so OK button should be enabled
                expect(container.find('.affirmative').prop('disabled')).toBeFalsy();

                container.find('.dialogValue').attr('value', " ");
                container.find("input").eq(0).trigger("change");
                // if the input field is empty of non-whitespace then the OK button should be disbled.
                expect(container.find('.affirmative').prop('disabled')).toBeTruthy();
            });
        });
        describe("downloadFile()", function () {
            it("Should set the url of the iframe to the download url", function () {
                var url = "http://testurl/";
                project.dom.downloadFile(url);
                expect($("body").find('#download-iframe').attr('src')).toEqual(url);
            })
        });
        describe("promptFileUpload()", function () {
            it("Should implement a hidden file upload form", function (done) {
                var container = $("<div>");
                project.dom.promptFileUpload(container)
                    .then(function () {
                        done();
                    })
                    .catch(done.fail);
                expect(container.find("#hidden-file-upload-holder").length).toEqual(1);
                container.find(".hiddenFileUpload").trigger("change");
            });
            it("Should remove the previous file upload form", function (done) {
                var container = $("<div>");
                container.append($("<span id='hidden-file-upload-holder'>previous</span>"));
                expect(container.find("#hidden-file-upload-holder").is("span")).toEqual(true);
                project.dom.promptFileUpload(container)
                    .then(function () {
                        expect(container.find("#hidden-file-upload-holder").is("div")).toEqual(true);
                        done();
                    })
                    .catch(done.fail);
                expect(container.find("#hidden-file-upload-holder").length).toEqual(1);
                container.find(".hiddenFileUpload").trigger("change");
            });
            it("Should timeout if no file chosen", function (done) {
                var container = $("<div>");
                project.dom.uploadTimeout = 1;
                project.dom.promptFileUpload(container)
                    .then(done.fail)
                    .catch(function (error) {
                        expect(error).toEqual('Upload Timed Out');
                        done();
                    });
            });
        });
    });

    ////// OverlayExtension
    describe("OverlayExtension tests", function () {
        it("Should show a customer overlay and disable the default", function () {
            var overlay = new OverlayExtension(project);
            spyOn(project.view, "configure");
            var message = "a message";

            overlay.show(null, message);

            expect(project.view.configure).toHaveBeenCalledWith({executionOverlay: false});
            expect(overlay.loadingOverlayMessage()).toEqual(message);
            expect(project.showLoadingOverlay()).toEqual(true);
        });
        it("Should hide the customer overlay and enable the default", function () {
            var overlay = new OverlayExtension(project);
            spyOn(project.view, "configure");

            overlay.hide();

            expect(project.view.configure).toHaveBeenCalledWith({executionOverlay: true});
            expect(project.showLoadingOverlay()).toEqual(false);
        });
    })

    ////// InsightRESTAPIv1
    describe('InsightRESTAPIv1 tests', function () {
        beforeEach(function () {
            spyOn(insight, "getVersion").and.returnValue(4);
            project.init(); // reboot framework into Insight 4 mode
        });
        describe('InsightRESTAPIv1.getVersion()', function () {
            it("Should return the version which should always be 1", function () {
                expect(project.api.getVersion()).toEqual(1);
            });
        });
        describe('InsightRESTAPIv1.restRequest()', function () {
            var path = "/testpath";
            var type = "POST";
            var data = "1234";
            var responseText = {result: 100};
            var successResponse = {
                status: 200,
                responseText: JSON.stringify(responseText)
            };
            var failureResponse = {
                status: 500
            };

            it("Should return the response as a resolved promise when request is successful", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(successResponse);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response.result).toBe(100);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should return the response as a rejected promise when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(failureResponse);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("Request failed: error");
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.getProjects()', function () {
            var children = {
                items:
                    [
                        {objectType: "FOLDER", displayName: "C"},
                        {objectType: "SCENARIO", displayName: "XXX"},
                        {objectType: "FOLDER", displayName: "c"},
                        {objectType: "FOLDER", displayName: "a"},
                        {objectType: "FOLDER", displayName: "_D"},
                        {objectType: "FOLDER", displayName: "b"}
                    ]
            };
            var projects = [
                {objectType: "FOLDER", name: "a"},
                {objectType: "FOLDER", name: "b"},
                {objectType: "FOLDER", name: "C"},
                {objectType: "FOLDER", name: "c"},
            ];

            it("Should return a sorted, filtered list of projects", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(children));

                project.api.getProjects(project.appId)
                    .then(function (response) {
                        expect(response).toEqual(projects);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.getChildren()', function () {
            var data = {
                items:
                    [
                        {objectType: "FOLDER", displayName: "C"},
                        {objectType: "SCENARIO", displayName: "XXX"},
                        {objectType: "FOLDER", displayName: "c"},
                        {objectType: "FOLDER", displayName: "a"},
                        {objectType: "FOLDER", displayName: "_D"},
                        {objectType: "FOLDER", displayName: "b"}
                    ]
            };

            it("Should return a sorted, filtered list of projects", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                project.api.getChildren(project.appId)
                    .then(function (response) {
                        var children = _.cloneDeep(data.items);
                        for (var i = 0; i < children.length; i++) {
                            children[i].name = children[i].displayName;
                            delete children[i].displayName;
                        }
                        expect(response).toEqual(children);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.createScenario()', function () {
            var newScenario = {
                displayname: "New",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                id: "1234"
            };
            var parent = {
                displayName: "parent",
                objectType: "FOLDER",
                id: "5678"
            };
            var desiredType = "PROJECT";
            var desiredName = "New";

            it("Should call app.createScenario and normalize the name field", function (done) {
                spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(_.cloneDeep(newScenario)));
                project.api.createScenario(project.app, parent, desiredName, desiredType)
                    .then(function (response) {
                        expect(project.app.createScenario).toHaveBeenCalledWith(parent, desiredName, desiredType);
                        var scenario = _.cloneDeep(newScenario);
                        scenario.name = scenario.displayName;
                        delete scenario.displayName;
                        expect(response).toEqual(scenario);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.cloneScenario()', function () {
            var sourceScenario = {
                displayName: "current name",
                id: "1234"
            };
            var parent = {
                displayName: "a folder",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };
            var newName = "new name";

            it("Should POST to /scenario to clone the source scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.cloneScenario(sourceScenario.id, parent, newName)
                    .then(function (response) {
                        var payload = {
                            displayName: newName,
                            sourceScenarioId: sourceScenario.id,
                            parent: parent
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenario", "POST", JSON.stringify(payload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.createRootFolder()', function () {

            var newFolder = {
                displayName: "new project",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should call app.CreateFolder to create a folder in the root", function (done) {
                spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(_.cloneDeep(newFolder)));
                project.api.createRootFolder(project.app, newFolder.displayName)
                    .then(function (response) {
                        var folder = _.cloneDeep(newFolder);
                        folder.name = folder.displayName;
                        delete folder.displayName;
                        expect(project.app.createFolder).toHaveBeenCalledWith(newFolder.displayName);
                        expect(response).toEqual(folder);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.deleteFolder()', function () {
            var folder = {
                displayName: "a folder",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should DELETE to /folder to delete the folder", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.deleteFolder(folder.id)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledWith("folder/" + folder.id, "DELETE");
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.renameScenario()', function () {
            var scenarioId = "1234";
            var newName = "new name";

            it("Should POST to /scenario to rename the scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.renameScenario(scenarioId, newName)
                    .then(function (response) {
                        var expectedPayload = {
                            id: scenarioId,
                            displayName: newName
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenario/" + scenarioId, "POST", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.renameFolder()', function () {
            var folderId = "1234";
            var newName = "new name";

            it("Should POST to /folder to rename the folder", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.renameFolder(folderId, newName)
                    .then(function (response) {
                        var expectedPayload = {
                            id: folderId,
                            displayName: newName
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("folder/" + folderId, "POST", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.shareScenario()', function () {
            var id = "1234";
            var shareStatus = "READONLY";

            it("Should POST to /scenario to rename the scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareScenario(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenario/" + id, "POST", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareScenario(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.shareFolder()', function () {
            var id = "1234";
            var shareStatus = "READONLY";

            it("Should POST to /folder to rename the folder", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareFolder(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("folder/" + id, "POST", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareFolder(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.moveFolderToRoot()', function () {
            var folder = {
                id: "1234",
                name: "a folder"
            };
            var expectedPayload = {
                id: folder.id,
                displayName: folder.name
            };

            it("Should POST to /project to move the folder to the root", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(expectedPayload)));
                project.api.moveFolderToRoot(project.appId, folder)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledWith("project/" + project.appId + "/children", "POST", JSON.stringify(expectedPayload));
                        expect(response).toEqual(folder);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.getFolderExportDownloadURL()', function () {
            var folder = {
                id: "1234",
                name: "a folder"
            };

            it("Should return a URL to the folder export resource", function () {
                expect(project.api.getFolderExportDownloadURL(folder.id)).toEqual(project.api.BASE_REST_ENDPOINT + "folder/" + folder.id + "/export");
            });
        });
        describe('InsightRESTAPIv1.uploadImportFile()', function () {
            it("Should post the file to the server", function (done) {
                var tempFoldername = "importProject_1234";
                var files = [
                    "a file"
                ];
                var folder = {
                    id: "import-target-id",
                    name: "importProject_1234",
                    objectType: "FOLDER",
                    url: "url//"
                };
                var formData = new FormData();
                formData.append("scenarios-file", files[0]);
                formData.append("parent-json", JSON.stringify(folder));
                var responseData = {
                    scenarios: {
                        items: [1, 2, 3]
                    },
                    folders: {
                        items: [4, 5, 6]
                    }
                };
                var successResponse = {
                    status: 200,
                    responseText: JSON.stringify(responseData)
                };


                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + "scenario").andReturn(successResponse);

                project.api.uploadImportFile(folder, files)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + "scenario");
                        expect(jasmine.Ajax.requests.mostRecent().params).toEqual(formData);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should reject if the ajax call to /scenario fails", function (done) {
                var tempFoldername = "importProject_1234";
                var files = [
                    "a file"
                ];
                var folder = {
                    id: "import-target-id",
                    name: "importProject_1234",
                    objectType: "FOLDER",
                    url: "url//"
                };
                var formData = new FormData();
                formData.append("scenarios-file", files[0]);
                formData.append("parent-json", JSON.stringify(folder));
                var successResponse = {
                    status: 200,
                    responseText: JSON.stringify({'blah': 'blah'})
                };
                var failResponse = {
                    status: 500
                };

                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + "scenario").andReturn(failResponse);

                project.api.uploadImportFile(folder, files)
                    .then(function (response) {
                        done.fail()
                    })
                    .catch(function () {
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.getScenarioEntities()', function () {
            var data = {
                'attrib1': 123,
                'attrib2': 456
            }
            var config = ["attrib1", "attrib2"];

            it("Should return a map of entities and values", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                project.api.getScenarioEntities(1234, config)
                    .then(function (response) {
                        expect(response).toEqual(data);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
    });

    ////// InsightRESTAPI
    describe('InsightRESTAPI tests', function () {
        beforeEach(function () {
            spyOn(insight, "getVersion").and.returnValue(5);
            project.init(); // reboot framework into Insight 5+ mode
        });
        describe('InsightRESTAPI.getVersion()', function () {
            it("Should return the version which should be 2", function () {
                expect(project.api.getVersion()).toEqual(2);
            });
        });
        describe('InsightRESTAPI.restRequest()', function () {
            var path = "/testpath";
            var type = "POST";
            var data = "1234";
            var responseText = {result: 100};
            var successResponse = {
                status: 200,
                responseText: JSON.stringify(responseText)
            };
            var failureResponseOuter = {
                status: 401,
                responseText: JSON.stringify({
                    error: {
                        code: 123,
                        message: "an outer error"
                    }
                })
            };
            var failureResponseInner = {
                status: 401,
                responseText: JSON.stringify({
                    error: {
                        code: 123,
                        message: "an outer error",
                        innerError: {
                            code: 456,
                            message: "an inner error"
                        }
                    }
                })
            };
            var emptyFailureResponse = {
                status: 500
            };
            var emptySuccessResponse = {
                status: 204
            };

            it("Should resolve to the response result when request is successful", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(successResponse);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response.result).toBe(100);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should resolve to empty promise when request is successful and no response body", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(emptySuccessResponse);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should reject to 'error' when request fails and no response body", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(emptyFailureResponse);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("error");
                        done();
                    });
            });
            it("Should reject to outer error if there is no inner error when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(failureResponseOuter);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("an outer error");
                        done();
                    });
            });
            it("Should reject to inner error if there is an inner error when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + path).andReturn(failureResponseInner);
                project.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("an inner error");
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.getProjects()', function () {
            var children = {
                content:
                    [
                        {objectType: "FOLDER", name: "C"},
                        {objectType: "SCENARIO", name: "XXX"},
                        {objectType: "FOLDER", name: "c"},
                        {objectType: "FOLDER", name: "a"},
                        {objectType: "FOLDER", name: "_D"},
                        {objectType: "FOLDER", name: "b"}
                    ]
            };
            var projects = [
                {objectType: "FOLDER", name: "a"},
                {objectType: "FOLDER", name: "b"},
                {objectType: "FOLDER", name: "C"},
                {objectType: "FOLDER", name: "c"},
            ];

            it("Should return a sorted, filtered list of projects", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(children));
                project.api.getProjects(project.appId)
                    .then(function (response) {
                        expect(response).toEqual(projects);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.getChildren()', function () {
            var data = {
                content:
                    [
                        {objectType: "FOLDER", name: "C"},
                        {objectType: "SCENARIO", name: "XXX"},
                        {objectType: "FOLDER", name: "c"},
                        {objectType: "FOLDER", name: "a"},
                        {objectType: "FOLDER", name: "_D"},
                        {objectType: "FOLDER", name: "b"}
                    ]
            };

            it("Should return a sorted, filtered list of projects", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                project.api.getChildren(project.appId)
                    .then(function (response) {
                        expect(response).toEqual(data.content);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.createScenario()', function () {
            var newScenario = {
                displayname: "New",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                id: "1234"
            };
            var parent = {
                displayName: "parent",
                objectType: "FOLDER",
                id: "5678"
            };
            var desiredType = "PROJECT";
            var desiredName = "New";

            it("Should call app.createScenario and normalize the name field", function (done) {
                spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(_.cloneDeep(newScenario)));
                project.api.createScenario(project.app, parent, desiredName, desiredType)
                    .then(function (response) {
                        expect(project.app.createScenario).toHaveBeenCalledWith(parent, desiredName, desiredType);
                        var scenario = _.cloneDeep(newScenario);
                        scenario.name = scenario.displayName;
                        delete scenario.displayName;
                        expect(response).toEqual(scenario);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.cloneScenario()', function () {
            var sourceScenario = {
                id: "1234",
                objectType: "SCENARIO"
            };
            var parent = {
                name: "a folder",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };
            var newName = "new name";

            it("Should POST to /scenario to clone the source scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.cloneScenario(sourceScenario.id, parent, newName)
                    .then(function (response) {
                        var payload = {
                            name: newName,
                            sourceScenario: sourceScenario,
                            parent: parent
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenarios", "POST", JSON.stringify(payload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.createRootFolder()', function () {

            var newFolder = {
                displayName: "new project",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should call app.CreateFolder to create a folder in the root", function (done) {
                spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(_.cloneDeep(newFolder)));
                project.api.createRootFolder(project.app, newFolder.displayName)
                    .then(function (response) {
                        var folder = _.cloneDeep(newFolder);
                        folder.name = folder.displayName;
                        delete folder.displayName;
                        expect(project.app.createFolder).toHaveBeenCalledWith(newFolder.displayName);
                        expect(response).toEqual(folder);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.deleteFolder()', function () {
            var folder = {
                displayName: "a folder",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should DELETE to /folders to delete the folder", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.deleteFolder(folder.id)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledWith("folders/" + folder.id, "DELETE");
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.renameScenario()', function () {
            var scenarioId = "1234";
            var newName = "new name";

            it("Should PATCH to /scenarios to rename the scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.renameScenario(scenarioId, newName)
                    .then(function (response) {
                        var expectedPayload = {
                            id: scenarioId,
                            name: newName
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenarios/" + scenarioId, "PATCH", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.renameFolder()', function () {
            var folderId = "1234";
            var newName = "new name";

            it("Should PATCH to /folders to rename the folder", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.renameFolder(folderId, newName)
                    .then(function (response) {
                        var expectedPayload = {
                            id: folderId,
                            name: newName
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("folders/" + folderId, "PATCH", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.shareScenario()', function () {
            var id = "1234";
            var shareStatus = "READONLY";

            it("Should PATCH to /scenarios to rename the scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareScenario(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("scenarios/" + id, "PATCH", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareScenario(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.shareFolder()', function () {
            var id = "1234";
            var shareStatus = "READONLY";

            it("Should PATCH to /folders to rename the scenario", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareFolder(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(project.api.restRequest).toHaveBeenCalledWith("folders/" + id, "PATCH", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.shareFolder(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.moveFolderToRoot()', function () {
            var folder = {
                name: "a folder",
                id: "1234"
            };
            var expectedPayload = {
                name: folder.name,
                id: folder.id
            };

            it("Should POST to /project to move the folder to the root", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(expectedPayload)));
                project.api.moveFolderToRoot(project.appId, folder)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledWith("apps/" + project.appId + "/children", "POST", JSON.stringify(expectedPayload));
                        expect(response).toEqual(folder);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.uploadImportFile()', function () {
            it("Should post the file to the server", function (done) {
                var tempFoldername = "importProject_1234";
                var files = [
                    "a file"
                ];
                var folder = {
                    id: "import-target-id",
                    name: "importProject_1234",
                    objectType: "FOLDER",
                    url: "url//"
                };
                var formData = new FormData();
                formData.append("scenarios-file", files[0]);
                formData.append("parent-json", JSON.stringify(folder));
                var responseData = {
                    id: "1234"
                };
                var successResponse = {
                    status: 200,
                    responseText: JSON.stringify({'data': responseData})
                };

                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + 'portations/imports').andReturn(successResponse);
                spyOn(project.api, "waitForUpload").and.returnValue(Promise.resolve());

                project.api.uploadImportFile(folder, files)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.api.BASE_REST_ENDPOINT + 'portations/imports');
                        expect(jasmine.Ajax.requests.mostRecent().params).toEqual(formData);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should reject if the ajax call to scenario fails", function (done) {
                var tempFoldername = "importProject_1234";
                var files = [
                    "a file"
                ];
                var folder = {
                    id: "import-target-id",
                    name: "importProject_1234",
                    objectType: "FOLDER",
                    url: "url//"
                };
                var formData = new FormData();
                formData.append("scenarios-file", files[0]);
                formData.append("parent-json", JSON.stringify(folder));
                var successResponse = {
                    status: 200,
                    responseText: JSON.stringify({'blah': 'blah'})
                };
                var failResponse = {
                    status: 500
                };

                jasmine.Ajax.stubRequest(project.api.BASE_REST_ENDPOINT + "portations/imports").andReturn(failResponse);

                project.api.uploadImportFile(folder, files)
                    .then(function (response) {
                        done.fail();
                    })
                    .catch(done);
            });
        });
        describe('InsightRESTAPI.exportFolder()', function () {
            var folder = {
                name: "a folder",
                id: "1234"
            };

            it("Should POST to portations/export", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve());
                project.api.exportFolder(folder)
                    .then(function () {
                        expect(project.api.restRequest).toHaveBeenCalledWith("portations/exports", "POST", JSON.stringify({source: folder}));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.waitForUpload()', function () {
            function responseFactory(status, importType) {
                importType = importType ? importType : "FOLDER";
                return Promise.resolve({
                    status: status,
                    reference: {
                        objectType: importType,
                        id: 5678
                    },
                    errorMessages: [
                            "an error"
                        ]
                });
            };

            it("Should keep polling the portation resource until the tasks is finished", function (done) {
                var portationId = 1234;
                spyOn(project.api, "restRequest").and.returnValues(
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("SUCCESS")
                );
                var children = [
                    {id: 1, objectType: "SCENARIO"},
                    {id: 2, objectType: "SCENARIO"},
                    {id: 3, objectType: "FOLDER"},
                    {id: 4, objectType: "SCENARIO"}
                ];
                spyOn(project.api, "getChildren").and.returnValue(Promise.resolve(children));
                spyOn(window, "clearInterval").and.callThrough();

                project.api.uploadPollingInterval = 1;
                project.api.waitForUpload(portationId)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledTimes(5);
                        expect(project.api.restRequest).toHaveBeenCalledWith("portations/imports/" + portationId, "GET");
                        expect(response.folders[0].id).toEqual(5678);
                        expect(response.scenarios.length).toEqual(3);
                        // expect the polling to have been stopped
                        expect(window.clearInterval).toHaveBeenCalled();
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should resolve to empty lists if we didnt import a parent folder", function (done) {
                var portationId = 1234;
                spyOn(project.api, "restRequest").and.returnValues(
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("SUCCESS", "NOTAFOLDER")
                );
                var children = [
                    {id: 1, objectType: "SCENARIO"},
                    {id: 2, objectType: "SCENARIO"},
                    {id: 3, objectType: "FOLDER"},
                    {id: 4, objectType: "SCENARIO"}
                ];
                spyOn(project.api, "getChildren").and.returnValue(Promise.resolve(children));
                spyOn(window, "clearInterval").and.callThrough();

                project.api.uploadPollingInterval = 1;
                project.api.waitForUpload(portationId)
                    .then(function (response) {
                        expect(project.api.restRequest).toHaveBeenCalledTimes(5);
                        expect(project.api.restRequest).toHaveBeenCalledWith("portations/imports/" + portationId, "GET");
                        expect(response.folders.length).toEqual(0);
                        expect(response.scenarios.length).toEqual(0);
                        // expect the polling to have been stopped
                        expect(window.clearInterval).toHaveBeenCalled();
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should stop polling if there is an error", function (done) {
                var portationId = 1234;
                spyOn(project.api, "restRequest").and.returnValues(
                    responseFactory("PORTING"),
                    responseFactory("PORTING"),
                    responseFactory("ERROR"),
                    responseFactory("PORTING"),
                    responseFactory("SUCCESS")
                );
                var children = [
                    {id: 1, objectType: "SCENARIO"},
                    {id: 2, objectType: "SCENARIO"},
                    {id: 3, objectType: "FOLDER"},
                    {id: 4, objectType: "SCENARIO"}
                ];
                spyOn(project.api, "getChildren").and.returnValue(Promise.resolve(children));
                spyOn(window, "clearInterval").and.callThrough();

                project.api.uploadPollingInterval = 1;
                project.api.waitForUpload(portationId)
                    .then(function (response) {
                        done.fail();
                    })
                    .catch(function (error) {
                        // expect the polling to have been stopped
                        expect(window.clearInterval).toHaveBeenCalled();
                        expect(error).toEqual("an error");
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.getScenarioEntities()', function () {
            var data = {
                entities: {
                    'attrib1': {value: 123},
                    'attrib2': {value: 456}
                }
            }
            var config = ["attrib1", "attrib2"];

            it("Should return a map of entities and values", function (done) {
                spyOn(project.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                project.api.getScenarioEntities(1234, config)
                    .then(function (response) {
                        expect(response).toEqual({
                            'attrib1': "123",
                            'attrib2': "456"
                        });
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
    });
});