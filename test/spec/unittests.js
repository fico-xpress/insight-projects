describe("Project framework", function () {
    'use strict';

    var project;

    // test data
    var projects = [
        {
            id: 'test-folder-id',
            displayName: 'test project',
            objectType: 'FOLDER'
        },
        {
            id: 'test-folder2-id',
            displayName: 'test2 project',
            objectType: 'FOLDER'
        }
    ];

    var scenarios = [
        {
            id: 'test-scenario-id',
            displayName: 'test project',
            objectType: 'SCENARIO',
            scenarioType: 'PROJECT',
            parent: projects[0]
        },
        {
            id: 'test-scenario2-id',
            displayName: 'a scenario',
            objectType: 'SCENARIO',
            scenarioType: 'SCENARIO',
            parent: projects[0]
        }
    ];

    beforeEach(function () {
        jasmine.Ajax.install();

        // mock the insight interface
        window.observer = {
            withEntities: function () {
                return this;
            },
            notify: function () {
                return this;
            },
            start: function () {
            }
        };
        window.schema = {
            getAllEntities: function() {
            }
        };

        window.insight = {
            getView: function () {
                return {
                    getApp: function () {
                        return {
                            getId: function () {
                                return "1234";
                            },
                            createScenario: function () {
                            },
                            createFolder: function () {
                            },
                            getModelSchema: function() {
                                return window.schema;
                            },
                            getUsers: function() {
                            }
                        }
                    },
                    executeScenario: function () {
                    },
                    setShelf: function () {
                    },
                    getScenarioIds: function () {
                    },
                    showErrorMessage: function() {
                    },
                    showInfoMessage: function() {
                    },
                    withAllScenarios: function() {
                        return window.observer;
                    },
                    withFirstScenario: function() {
                        return window.observer;
                    }
                };
            },
            openView: function () {
            },
            enums: {
                ExecutionType: {
                    LOAD: 'LOAD',
                    RUN: 'RUN'
                }
            },
            resolveRestEndpoint: jasmine.createSpy().and.callFake(_.identity)
        };
        window.VDL = function () {
        };

        project = new ProjectFramework();
        project.BASE_REST_ENDPOINT = "http://localhost:8860/" + project.BASE_REST_ENDPOINT;
        spyOn(project, "_initShelfValidation");
        spyOn(project, "_initProjectRevisionTracking");
        project.init();
        expect(project._initShelfValidation).toHaveBeenCalled();
    });
    afterEach(function () {
        jasmine.Ajax.uninstall();
    });
    
    describe('createProject()', function () {
        var newFolder =
            {
                id: 'new-folder-id',
                displayName: 'new project',
                objectType: 'FOLDER'
            };

        var newProjectScenario =
            {
                id: 'test-scenario-id',
                displayName: 'new project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: newFolder
            };

        var newProjectName = "new project";

        beforeEach(function () {
            spyOn(project, "_validateProjectName").and.returnValue(true);
            spyOn(project, "_deBounceNewProjectButton").and.returnValue(false);
            spyOn(project.view, "showErrorMessage");
        });

        it("Should create and open a new project", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve(true));
            spyOn(project.view, "setShelf").and.returnValue(Promise.resolve());
            spyOn(insight, "openView").and.returnValue(Promise.resolve());

            project.createProject(newProjectName)
                .then(function () {
                    expect(project.app.createFolder).toHaveBeenCalledWith(project.view.getApp()._data, newProjectName);
                    expect(project.app.createScenario).toHaveBeenCalledWith(newFolder, newProjectName, project.config.projectScenarioType);
                    expect(project.view.executeScenario).toHaveBeenCalledWith(newProjectScenario.id, insight.enums.ExecutionType.LOAD, {suppressClearPrompt: true});
                    expect(project.view.setShelf).toHaveBeenCalledWith([newProjectScenario.id]);
                    expect(insight.openView).toHaveBeenCalledWith(project.config.defaultView);
                    done();
                })
                .catch(done.fail);
        });
        it("Should report an error when createFolder fails", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.reject());

            project.createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when createScenario fails", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.app, "createScenario").and.returnValue(Promise.reject());

            project.createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when executeScenario fails", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.reject());

            project.createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when setShelf fails", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve());
            spyOn(project.view, "setShelf").and.throwError();
            //spyOn(insight, "openView").and.returnValue(Promise.resolve());

            project.createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
        it("Should report an error when openView fails", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(newFolder));
            spyOn(project.app, "createScenario").and.returnValue(Promise.resolve(newProjectScenario));
            spyOn(project.view, "executeScenario").and.returnValue(Promise.resolve());
            spyOn(project.view, "setShelf");
            spyOn(insight, "openView").and.throwError();

            project.createProject(newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to create project');
                    done(); // expected to fail
                });
        });
    });
    describe('openProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

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
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should open the rename dialog for an existing project", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");

            project.renameProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("rename", "Rename Project", "", "", jasmine.any(Function), existingFolder.displayName);
        });
    });
    describe('deleteProject()', function () {
        it("Should open the delete dialog for an existing project", function () {
            spyOn(project.dom, "showConfirmationDialog");

            project.deleteProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("delete", "Delete Project", "Are you sure you wish to delete this project?", "This operation cannot be undone.", jasmine.any(Function));
        });
    });
    describe('cloneProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should open the clone dialog for an existing project", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");

            project.cloneProject();
            expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("clone", "Clone Project",  "", 'Clone Project will clone the project settings only. If you wish to clone your scenarios as well, export the project and then re-import it.', jasmine.any(Function), existingFolder.displayName );
        });
    });
    describe('_exportProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should show message and commence file download", function () {
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
            spyOn(project.dom, "showConfirmationDialog");
            spyOn(project.dom, "downloadFile");
            spyOn(project.view, "showInfoMessage");


            project._exportProject();
            expect(project.view.showInfoMessage).toHaveBeenCalledWith('Exporting project \'' + existingFolder.displayName + '\'...')
            expect(project.dom.downloadFile).toHaveBeenCalledWith(project.BASE_REST_ENDPOINT + 'folder/' + existingFolder.id + '/export');
        });
    });
    describe('importProject()', function () {
        var newFolder =
            {
                id: 'new-folder-id',
                displayName: 'new project',
                objectType: 'FOLDER'
            };

        var newProjectScenario =
            {
                id: 'test-scenario-id',
                displayName: 'new project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: newFolder
            };

        var newProjectName = "new project";

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should import the project and open the default view", function (done) {
            spyOn(project, "newProjectName").and.returnValue(newProjectName);
            spyOn(project, "_validateProjectName").and.returnValue(true);
            spyOn(insight, "openView");
            spyOn(project, "_importProject").and.returnValue(Promise.resolve(true));

            project.importProject(newProjectName)
                .then(function () {
                    expect(project._importProject).toHaveBeenCalledWith(newProjectName);
                    done();
                })
                .catch(done.fail);
        });
    });
    describe('validateShelf()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
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
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
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
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("share", "Share Project", "", "", jasmine.any(Function),"SHARE_PRIVATE");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_READONLY", function (done) {
            existingFolder.shareStatus = "READONLY";
            existingProjectScenario.shareStatus = "READONLY";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("share", "Share Project", "", "",  jasmine.any(Function), "SHARE_READONLY");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_PROJECTREADONLY", function (done) {
            existingFolder.shareStatus = "FULLACCESS";
            existingProjectScenario.shareStatus = "READONLY";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("share", "Share Project", "", "", jasmine.any(Function), "SHARE_PROJECTREADONLY");
                    done();
                })
                .catch(done.fail)
        });
        it("Should correctly identify an existing project shared as SHARE_FULL", function (done) {
            existingFolder.shareStatus = "FULLACCESS";
            existingProjectScenario.shareStatus = "FULLACCESS";
            project.shareProject(existingFolder.id)
                .then(function () {
                    expect(project.dom.showConfirmationDialog).toHaveBeenCalledWith("share", "Share Project", "", "", jasmine.any(Function), "SHARE_FULL");
                    done();
                })
                .catch(done.fail);
        });
        it("Should not show an error for an invalid project share status", function (done) {
            existingFolder.shareStatus = "PRIVATE";
            existingProjectScenario.shareStatus = "FULLACCESS";
            project.shareProject(existingFolder.id)
                .then(function() {
                    expect(project.view.showErrorMessage).not.toHaveBeenCalled();
                    done();
                })
            .catch(done.fail);
        });

    });
    describe('_restRequest()', function () {
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
            jasmine.Ajax.stubRequest(project.BASE_REST_ENDPOINT + path).andReturn(successResponse);
            project._restRequest(path, type, data)
                .then(function (response) {
                    expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.BASE_REST_ENDPOINT + path);
                    expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                    expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                    expect(response.result).toBe(100);
                    done();
                })
                .catch(done.fail);
        });
        it("Should return the response as a rejected promise when request is unsuccessful", function (done) {
            jasmine.Ajax.stubRequest(project.BASE_REST_ENDPOINT + path).andReturn(failureResponse);
            project._restRequest(path, type, data)
                .then(function (response) {
                    fail();
                })
                .catch(function (response) {
                    expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.BASE_REST_ENDPOINT + path);
                    expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                    expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                    expect(response).toBe("error");
                    done();
                });
        });
    });
    describe('_getProjects()', function () {
        var rootChildren =
            [
                {
                    id: 'folder-id-1',
                    displayName: 'existing project 1',
                    objectType: 'FOLDER',
                    ownerId: 'admin'
                },
                {
                    id: 'scenario-id-1',
                    displayName: 'an orphan scenario',
                    objectType: 'SCENARIO',
                    ownerId: 'admin'
                },
                {
                    id: 'folder-id-2',
                    displayName: 'existing project 2',
                    objectType: 'FOLDER',
                    ownerId: 'admin'
                }
            ];

        var users = [
            {
                _data: {
                    username: "admin",
                    displayName: "Administrator User"
                }
            }
        ];
        var successResponse = {
            status: 200,
            responseText: JSON.stringify({items: rootChildren})
        };

        it("Should get the list of existing project folders", function (done) {
            spyOn(project, "currentProjectFolders");
            var path = project.BASE_REST_ENDPOINT + 'project/' + project.appId + '/children?maxResults=9999';
            jasmine.Ajax.stubRequest(path).andReturn(successResponse);
            spyOn(project.app, "getUsers").and.returnValue(Promise.resolve(users));

            project._getProjects()
                .then(function () {
                    var projects = [rootChildren[0], rootChildren[2]];
                    projects[0].ownerDisplayName = "Administrator User";
                    projects[1].ownerDisplayName = "Administrator User";

                    expect(project.currentProjectFolders).toHaveBeenCalledWith(projects);
                    done();
                })
                .catch(done.fail)
        });
        it("Should show an error when it fails to get the list of folders", function (done) {
            var path = project.BASE_REST_ENDPOINT + 'project/' + project.appId + '/children?maxResults=9999';
            jasmine.Ajax.stubRequest(path).andReturn({status: 500});
            spyOn(project.view, "showErrorMessage");

            project._getProjects()
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Unexpected error fetching projects list');
                    done();
                })
        });
    });
    describe('_getProjectScenarioForFolder()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };

        beforeEach(function() {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should reject if no folder id specified", function (done) {
            project._getProjectScenarioForFolder(/* undefined */)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('This doesn\'t look like a project folder.');
                    done();
                });
        });
        it("Should resolve to project scenario if project scenario exists for project", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve({items: [existingProjectScenario]}));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(function (projectScenario) {
                    expect(projectScenario).toEqual(existingProjectScenario);
                    done();
                })
                .catch(done.fail);
        });
        it("Should reject if project scenario doesnt exist for project", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve({items: []}));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('This doesn\'t look like a project folder.');
                    done();
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
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var children =
            [
                {
                    id: 'scenario-id-1',
                    displayName: 'scenario 1',
                    objectType: 'SCENARIO',
                    scenarioType: 'SCENARIO',
                    parent: existingFolder
                },
                {
                    id: 'project-scenario-id',
                    displayName: 'existing project',
                    objectType: 'SCENARIO',
                    scenarioType: 'PROJECT',
                    parent: existingFolder
                },
                {
                    id: 'scenario-id-2',
                    displayName: 'scenario 2',
                    objectType: 'SCENARIO',
                    scenarioType: 'SCENARIO',
                    parent: existingFolder
                }
            ];

        it("Should resolve to the project scenario if we find it", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve({items: children}));
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
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve({items: temp}));
            project._getProjectScenarioForFolder(existingFolder.id)
                .then(done.fail)
                .catch(function () {
                    expect().nothing();
                    done(); // expected to not succeed
                });
        });
        it("Should throw error if the request to list children fails", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.reject());
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
                displayName: 'existing project 1',
                objectType: 'FOLDER'
            },
                {
                    id: 'folder-id-2',
                    displayName: 'existing project 2',
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
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var cloneProjectName = "cloned project";
        var clonedFolder =
            {
                id: 'cloned-folder-id',
                displayName: cloneProjectName,
                objectType: 'FOLDER'
            };
        var clonedProjectScenario =
            {
                id: 'cloned-project-scenario-id',
                displayName: cloneProjectName,
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: clonedFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
        });

        it("Should clone the project to the target name when there isnt already a project called the target name", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project, "_cloneScenario").and.returnValue(Promise.resolve(clonedProjectScenario));
            spyOn(project.view, "showInfoMessage");

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(function () {
                    var msg = 'Project "' + existingProjectScenario.displayName + '" was successfully cloned to project "' + clonedProjectScenario.displayName + '".';
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith(msg)
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error message when it fails to clone the project folder", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.reject());
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());
            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    var msg = 'Failed to clone project \"' + existingFolder.displayName + '\". No changes were made.';
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(msg);
                    done();
                });
        });
        it("Should clone the project to a decorated target name where there is already a project called the target name", function (done) {
            var decoratedName = cloneProjectName + "(1)";
            var tempClonedFolder = _.clone(clonedFolder);
            tempClonedFolder.displayName = decoratedName;
            var tempClonedProjectScenario = _.clone(clonedProjectScenario);
            tempClonedProjectScenario.displayName = decoratedName;

            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(tempClonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project, "_cloneScenario").and.returnValue(Promise.resolve(tempClonedProjectScenario));
            spyOn(project.view, "showInfoMessage");

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(function () {
                    var msg = 'Project "' + existingProjectScenario.displayName + '" was successfully cloned and named "' + tempClonedProjectScenario.displayName + '" to avoid a naming conflict.';
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith(msg);
                    done();
                })
                .catch(done.fail);
        });
        it("Should delete the new project folder when it fails to clone the project scenario", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project, "_cloneScenario").and.returnValue(Promise.reject());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + clonedFolder.id, 'DELETE', null, null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to clone project "' + existingProjectScenario.displayName + '". Changes were rolled back.');
                    done();
                });
        });
        it("Should show an error message when it failed to delete the new project folder", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(clonedFolder));
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(existingProjectScenario));
            spyOn(project, "_cloneScenario").and.returnValue(Promise.reject());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_restRequest").and.returnValue(Promise.reject());

            project._cloneFolderAndProjectScenario(existingFolder.id, cloneProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + clonedFolder.id, 'DELETE', null, null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to clone project "' + existingProjectScenario.displayName + '". A folder for this new project was created, you can delete it using the Scenario Explorer.');
                    done();
                });
        });
    });
    describe('_cloneScenario()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var cloneProjectName = "cloned project";
        var clonedFolder =
            {
                displayName: cloneProjectName,
                id: 'cloned-folder-id',
                objectType: 'FOLDER'
            };
        var clonedProjectScenario =
            {
                id: 'cloned-project-scenario-id',
                displayName: cloneProjectName,
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: clonedFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolder);
        });

        it("Should clone a scenario", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve(clonedProjectScenario));
            project._cloneScenario(existingProjectScenario.id, clonedFolder, cloneProjectName)
                .then(function (scenario) {
                    expect(scenario).toEqual(clonedProjectScenario);

                    var expectedPayload = {
                        displayName: cloneProjectName,
                        sourceScenarioId: existingProjectScenario.id,
                        parent: clonedFolder
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario', 'POST', JSON.stringify(expectedPayload), 'JSON');
                    done();
                });
        });

    });
    describe('_deleteProject()', function () {
        var existingFolders =
            [
                {
                    id: 'folder-id',
                    displayName: 'existing project',
                    objectType: 'FOLDER'
                },
                {
                    id: 'folder-id-2',
                    displayName: 'existing project 2',
                    objectType: 'FOLDER'
                }
            ];

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
            spyOn(project, "_getProjectFolderObject").and.returnValue(existingFolders[0]);
        });

        it("Should delete the project folder, update the folder list and show a message", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_getProjects");

            project._deleteProject(existingFolders[0].id)
                .then(function () {
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolders[0].id, 'DELETE', null, null);
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project "' + existingFolders[0].displayName + '" successfully deleted.');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error message when it fails to delete the folder", function (done) {
            spyOn(project, "_restRequest").and.returnValue(Promise.reject());
            spyOn(project.view, "showInfoMessage");

            project._deleteProject(existingFolders[0].id)
                .then(done.fail)
                .catch(function () {
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolders[0].id, 'DELETE', null, null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('Failed to delete project "' + existingFolders[0].displayName + '". No changes have been made.');
                    done();
                });
        });
    });
    describe("_handleRenameConfirmation()", function () {
        var rootChildren =
            [
                {
                    id: 'folder-id-1',
                    displayName: 'existing project 1',
                    objectType: 'FOLDER'
                },
                {
                    id: 'scenario-id-1',
                    displayName: 'an orphan scenario',
                    objectType: 'SCENARIO'
                },
                {
                    id: 'folder-id-2',
                    displayName: 'existing project 2',
                    objectType: 'FOLDER'
                }
            ];
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project 1',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: rootChildren[0]
            };
        var newProjectName = "renamed project";

        beforeEach(function() {
            spyOn(project, "_renameFolderAndProjectScenario").and.returnValue(Promise.resolve());
            spyOn(project.view, "showErrorMessage");
        })

        it("should accept a valid new name", function(done) {
            spyOn(project, "_getModalValue").and.returnValue("a new name");
            spyOn(project, "currentProjectFolders").and.returnValue(rootChildren);
            project._handleRenameConfirmation(rootChildren[0])
                .then(function() {
                    expect(project._renameFolderAndProjectScenario).toHaveBeenCalled();
                    expect(project.view.showErrorMessage).not.toHaveBeenCalled();
                    done();
                });
        });
        it("should reject a valid new name that is already in use", function(done) {
            spyOn(project, "_getModalValue").and.returnValue("existing project 2");
            spyOn(project, "currentProjectFolders").and.returnValue(rootChildren);
            project._handleRenameConfirmation(rootChildren[0])
                .then(done.fail)
                .catch(function() {
                    expect(project._renameFolderAndProjectScenario).not.toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Cannot rename. A project exists with the same name");
                    done();
                });
        });
        it("should reject an invalid name", function(done) {
            spyOn(project, "_getModalValue").and.returnValue("_new name");
            spyOn(project, "currentProjectFolders").and.returnValue(rootChildren);
            project._handleRenameConfirmation(rootChildren[0])
                .then(done.fail)
                .catch(function() {
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
                displayName: 'existing project',
                objectType: 'FOLDER'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                parent: existingFolder
            };
        var newProjectName = "renamed project";

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });

        it("Should rename existing project folder and scenario, update projects list and show info message", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());
            spyOn(project.view, "showInfoMessage");
            spyOn(project, "_getProjects");

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(function () {
                    var payload =
                        {
                            id: existingProjectScenario.id,
                            displayName: newProjectName
                        };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    payload =
                        {
                            id: existingFolder.id,
                            displayName: newProjectName
                        };
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolder.id, 'POST', JSON.stringify(payload), null);

                    var newFolder = _.clone(existingFolder);
                    newFolder.displayName = newProjectName;
                    expect(project._getProjects).toHaveBeenCalled();
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project successfully renamed from "' + existingFolder.displayName + '" to "' + newFolder.displayName + '".');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if the project scenario cant be located", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.reject());
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project. Action rolled back.");
                    done();
                });
        });
        it("Should show an error if renaming the project scenario fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValue(Promise.reject());

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function () {
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project. Action rolled back.");
                    done();
                });
        });
        it("Should show an error and rollback the project scenario if renaming the project folder fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // renaming the project scenario succeeds
                Promise.reject(),   // renaming the project folder fails
                Promise.resolve()   // rolling back the project scenario succeeds
            );

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    var payload = {
                        id: existingProjectScenario.id,
                        displayName: existingFolder.displayName
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project folder. Action rolled back.");
                    done();
                });
        });
        it("Should show an error if it fails to rollback", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // renaming the project scenario succeeds
                Promise.reject(),   // renaming the project folder fails
                Promise.reject()   // rolling back the project scenario fails
            );

            project._renameFolderAndProjectScenario(existingFolder.id, newProjectName)
                .then(done.fail)
                .catch(function (error) {
                    var payload = {
                        id: existingProjectScenario.id,
                        displayName: existingFolder.displayName
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to rename the project folder but could not roll back action. To correct this error state please rename your project again.");
                    done();
                });
        });
    });
    describe('_shareProject()', function () {
        var existingFolder =
            {
                id: 'folder-id',
                displayName: 'existing project',
                objectType: 'FOLDER',
                shareStatus: 'XYZ'
            };
        var existingProjectScenario =
            {
                id: 'project-scenario-id',
                displayName: 'existing project',
                objectType: 'SCENARIO',
                scenarioType: 'PROJECT',
                shareStatus: 'XYZ',
                parent: existingFolder
            };

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
            spyOn(project, "currentProjectFolders").and.returnValue([_.clone(existingFolder)]);
            spyOn(project, "_getProjects");
        });

        it("Should share a project as SHARE_PRIVATE", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.resolve()   // setting the project folder share status succeeds
            );
            spyOn(project.view, "showInfoMessage");

            project._shareProject(existingFolder.id, "SHARE_PRIVATE")
                .then(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: "PRIVATE"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    payload = {
                        id: existingFolder.id,
                        shareStatus: "PRIVATE"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolder.id, 'POST', JSON.stringify(payload), null);
                    expect(project._getProjects).toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });
        it("Should share a project as SHARE_READONLY", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.resolve()   // setting the project folder share status succeeds
            );
            spyOn(project.view, "showInfoMessage");

            project._shareProject(existingFolder.id, "SHARE_READONLY")
                .then(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: "READONLY"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    payload = {
                        id: existingFolder.id,
                        shareStatus: "READONLY"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolder.id, 'POST', JSON.stringify(payload), null);
                    expect(project._getProjects).toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });
        it("Should share a project as SHARE_PROJECTREADONLY", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.resolve()   // setting the project folder share status succeeds
            );
            spyOn(project.view, "showInfoMessage");

            project._shareProject(existingFolder.id, "SHARE_PROJECTREADONLY")
                .then(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: "READONLY"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    payload = {
                        id: existingFolder.id,
                        shareStatus: "FULLACCESS"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolder.id, 'POST', JSON.stringify(payload), null);
                    expect(project._getProjects).toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });
        it("Should share a project as SHARE_FULL", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.resolve()   // setting the project folder share status succeeds
            );
            spyOn(project.view, "showInfoMessage");

            project._shareProject(existingFolder.id, "SHARE_FULL")
                .then(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: "FULLACCESS"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    payload = {
                        id: existingFolder.id,
                        shareStatus: "FULLACCESS"
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + existingFolder.id, 'POST', JSON.stringify(payload), null);
                    expect(project._getProjects).toHaveBeenCalled();
                    done();
                })
                .catch(done.fail);
        });
        it("Should roll back scenario share status change when folder share status change fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.reject(),   // setting the project folder share status fails
                Promise.resolve()   // setting the project folder share status succeeds
            );

            project._shareProject(existingFolder.id, "SHARE_PRIVATE")
                .then(done.fail)
                .catch(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: existingProjectScenario.shareStatus
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to change share status for project folder. Action rolled back.");
                    done();
                });
        });
        it("Should show an error message when roll back fails", function (done) {
            spyOn(project, "_getProjectScenarioForFolder").and.returnValue(Promise.resolve(_.clone(existingProjectScenario)));
            spyOn(project, "_restRequest").and.returnValues(
                Promise.resolve(),  // setting the project scenario share status succeeds
                Promise.reject(),   // setting the project folder share status fails
                Promise.reject()   // setting the project folder share status succeeds
            );

            project._shareProject(existingFolder.id, "SHARE_PRIVATE")
                .then(done.fail)
                .catch(function () {
                    var payload = {
                        id: existingProjectScenario.id,
                        shareStatus: existingProjectScenario.shareStatus
                    };
                    expect(project._restRequest).toHaveBeenCalledWith('scenario/' + existingProjectScenario.id, 'POST', JSON.stringify(payload), null);
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith("Failed to change share status for project folder but could not rollback. To correct this error state please set the share status directly.");
                    done();
                });
        });
    });
    describe('_deBounceNewProjectButton()', function () {
        it("Should prevent a project with the same name being created twice in quick succession", function (done) {
            var testProjectName = "test project";
            project.deBounceNewProjectNames = [];
            expect(project._deBounceNewProjectButton(testProjectName)).toBeFalsy();
            setTimeout(function () {
                expect(project._deBounceNewProjectButton(testProjectName)).toBeTruthy();
                done();
            }, 10);
        });
        it("Should not prevent a project with the same name being created twice with a suitable time gap between", function (done) {
            var testProjectName = "test project";
            project.deBounceNewProjectNames = [];
            expect(project._deBounceNewProjectButton(testProjectName)).toBeFalsy();
            setTimeout(function () {
                expect(project._deBounceNewProjectButton(testProjectName)).toBeFalsy();
                done();
            }, 2100);
        });
    });
    describe('_importProject()', function () {
        var workingFolder = {
            id: "import-target-id",
            displayName: "importProject_1234",
            objectType: "FOLDER",
            url: "url//"
        };
        var importFolders = [
            {
                id: "project-folder-id",
                displayName: "project 1",
                objectType: "FOLDER",
                url: "url//",
                parent: workingFolder
            }
        ];
        var importScenarios = [
            {
                id: "project-scenario-id",
                displayName: "project 1",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                url: "url//",
                parent: importFolders[0]
            }
        ];
        var desiredProjectName = "imported project";
        var workingFolderName = "importProject_1234";
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
        var desiredProjectName = "imported project";
        var workingFolderName = "importProject_1234";

        it("Should orchestrate the import of the project", function (done) {
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.dom, "promptFileUpload").and.returnValue(Promise.resolve(files));
            spyOn(project, "_processImportProjectFile").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.resolve(importScenarios[0]));
            spyOn(project, "_cleanupWorkingFolder").and.returnValue(Promise.resolve());
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project.dom, "trigger");
            spyOn(project, "_moveToProject");
            spyOn(project.view, "showInfoMessage");

            project._importProject(desiredProjectName)
                .then(function () {
                    expect(project.dom.promptFileUpload).toHaveBeenCalled();
                    expect(project._processImportProjectFile).toHaveBeenCalledWith(workingFolder, files);
                    expect(project._handleImportedProject).toHaveBeenCalledWith(desiredProjectName, workingFolder, importResponse);
                    expect(project.dom.trigger.calls.first().args).toEqual(['project.overlay.show', 'Importing Project']);
                    expect(project._cleanupWorkingFolder).toHaveBeenCalledWith(workingFolder.id);
                    // make sure the last change was a hide
                    expect(project.dom.trigger.calls.mostRecent().args).toEqual(['project.overlay.hide']);
                    expect(project._moveToProject).toHaveBeenCalledWith(importScenarios[0]);
                    expect(project.view.showInfoMessage).toHaveBeenCalledWith('Project imported successfully as "' + importScenarios[0].displayName + '"');
                    done();
                })
                .catch(done.fail);
        });
        it("Should show an error if anything went wrong during the import", function (done) {
            var errormsg = "Error during project import. The imported file does not contain a project scenario";
            spyOn(project.app, "createFolder").and.returnValue(Promise.resolve(workingFolder));
            spyOn(project.dom, "promptFileUpload").and.returnValue(Promise.resolve(files));
            spyOn(project, "_processImportProjectFile").and.returnValue(Promise.resolve(importResponse));
            spyOn(project, "_handleImportedProject").and.returnValue(Promise.reject(errormsg));
            spyOn(Date, "now").and.returnValue("1234");
            spyOn(project.dom, "trigger");
            spyOn(project, "_handleUpgradeErrors").and.callThrough();
            spyOn(project, "_restRequest").and.returnValue(Promise.resolve());
            spyOn(project.view, "showErrorMessage");

            project._importProject(desiredProjectName)
                .then(done.fail)
                .catch(function () {

                    expect(project.dom.trigger.calls.first().args).toEqual(['project.overlay.show', 'Importing Project']);
                    expect(project.dom.trigger.calls.mostRecent().args).toEqual(['project.overlay.hide']);
                    expect(project._handleUpgradeErrors).toHaveBeenCalled();
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith(errormsg);
                    expect(project._restRequest).toHaveBeenCalledWith('folder/' + workingFolder.id, 'DELETE', null, null)
                    expect(project.view.showErrorMessage).toHaveBeenCalledWith('The import was rolled back.');
                    done();
                });
        });
    });
    describe('_processImportProjectFile()', function () {
        it("Should post the file to the server", function (done) {
            var tempFoldername = "importProject_1234";
            var files = [
                "a file"
            ];
            var folder = {
                id: "import-target-id",
                displayName: "importProject_1234",
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

            jasmine.Ajax.stubRequest(project.BASE_REST_ENDPOINT + "scenario").andReturn(successResponse);

            project._processImportProjectFile(folder, files)
                .then(function (response) {
                    expect(jasmine.Ajax.requests.mostRecent().url).toBe(project.BASE_REST_ENDPOINT + "scenario");
                    expect(jasmine.Ajax.requests.mostRecent().params).toEqual(formData);
                    done();
                })
                .catch(done.fail);
        });
    });
    describe('_handleImportedProject() and _handleUpgradeErrors()', function () {
        var workingFolder = {
            id: "import-target-id",
            displayName: "importProject_1234",
            objectType: "FOLDER",
            url: "url//"
        };
        var importFolders = [
            {
                id: "project-folder-id",
                displayName: "project 1",
                objectType: "FOLDER",
                url: "url//",
                parent: workingFolder
            }
        ];
        var importScenarios = [
            {
                id: "project-scenario-id",
                displayName: "project 1",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                url: "url//",
                parent: importFolders[0]
            }
        ];
        var desiredProjectName = "imported project";
        var workingFolderName = "importProject_1234";
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

        beforeEach(function () {
            spyOn(project.view, "showErrorMessage");
        });
        it("Should handle the imported folder if the import contents are valid", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            project._handleImportedProject(desiredProjectName, workingFolder, importResponse)
                .then(function () {
                    expect(project._handleImportedFolder).toHaveBeenCalledWith(importFolders[0], importScenarios[0], desiredProjectName);
                    done();
                })
                .catch(done.fail);
        });
        it("Should return an error if the import request failed", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            tempResponse.response.status = 404;

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Unexpected error during project import");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
        it("Should return an error if the import doesnt contain a project scenario", function (done) {
            spyOn(project, "_handleImportedFolder").and.returnValue(Promise.resolve());
            var tempResponse = _.cloneDeep(importResponse);
            tempResponse.response.scenarios.items[0].scenarioType = "NOTAPROJECT";

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
            tempResponse.response.scenarios.items.push(tempResponse.response.scenarios.items[0]);

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
            tempResponse.response.folders.items = [];

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
            tempResponse.response.folders.items.push(tempResponse.response.folders.items[0]);

            project._handleImportedProject(desiredProjectName, workingFolder, tempResponse)
                .then(done.fail)
                .catch(function (error) {
                    expect(error).toBe("Error during project import. The imported file contains more than one project folder");
                    expect(project._handleImportedFolder).not.toHaveBeenCalled();
                    done();
                });
        });
    });
    describe("_init()", function () {
        it("Should set up subscriptions and register custom overlay extension", function () {
            spyOn(project.currentProjectFolders, "subscribe");
            spyOn(window, "VDL");
            spyOn(project, "shelfValid").and.returnValue(true);

            project._init();

            expect(project._initShelfValidation).toHaveBeenCalled();
            expect(window.VDL).toHaveBeenCalled();
        });
        it("Should get list of existing projects for a management view type", function () {
            spyOn(project.currentProjectFolders, "subscribe");
            spyOn(project, "_getProjects");
            spyOn(window, "VDL");
            spyOn(project, "shelfValid").and.returnValue(true);

            project.config.viewType = "manage";
            project._init();

            expect(project._getProjects).toHaveBeenCalled();
            expect(project._initShelfValidation).toHaveBeenCalled();
            expect(window.VDL).toHaveBeenCalled();
        });
    });
    describe('_validateForProjectPage', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function() {
                    return this._props.name;
                },
                getPath: function() {
                    return this._props.path;
                },
                getScenarioType: function() {
                    return this._props.scenarioType;
                },
                getScalar: function(name) {
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
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}),
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
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}),
                scenario({name: "project 2", scenarioType: project.config.projectScenarioType, path: "/myapp/project 2/project 2"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"})
            ];
            var invalidProjects = [scenarios[0].getName(), scenarios[1].getName()];
            var message = project._validateForProjectPage(scenarios);
            expect(message).toBe('You have added the following project' + ((invalidProjects.length > 1) ? 's' : '') + ' to the shelf: "' + invalidProjects.join('", "') + '". Please ensure that you only have one project scenario and that it is in the first position.');
        });
        it("A project not at the start of the shelf is invalid", function () {
            var scenarios = [
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}),
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"})
            ];
            var message = project._validateForProjectPage(scenarios);
            var foundProjectDetails = scenarios[1];
            expect(message).toBe('Project "' + foundProjectDetails.getName() + '" is not in the correct shelf position. Please place it into the first position on the shelf.');
        });
        it("A scenario that doesnt belong to the project invalid", function () {
            var scenarios = [
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 2/scenario 1"})
            ];

            var message = project._validateForProjectPage(scenarios);
            var foundProjectDetails = scenarios[0];
            var invalidScenarios = [scenarios[2].getName()];
            expect(message).toBe('There are scenarios from different projects other than "' + foundProjectDetails.getName() + '" on the shelf. Please remove the following scenario' + ((invalidScenarios.length > 1) ? 's: ' : ': "') + invalidScenarios.join('", "') + '".');
        });
    });
    describe('_validateForScenarioPage', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function() {
                    return this._props.name;
                },
                getPath: function() {
                    return this._props.path;
                },
                getScenarioType: function() {
                    return this._props.scenarioType;
                },
                getScalar: function(name) {
                    return this._entities[name];
                }
            };
        };

        // a shelf is legal if its legal for a project page
        // except that it needs at least one scenario that isnt the prject
        it("A single project scenario is invalid", function () {
            var scenarios = [
                scenario({name: "project scenario", scenarioType: "PROJECT", path: "/myapp/project scenario"})
            ];
            spyOn(project, "_validateForProjectPage").and.returnValue("");
            var message = project._validateForScenarioPage(scenarios);
            expect(message).toBe('This view requires at least one scenario to be selected. Create a new scenario or select an existing scenario by clicking on the grey scenario shelf above.');
        });
    });
    describe('_initProjectRevisionTracking', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function() {
                    return this._props.name;
                },
                getPath: function() {
                    return this._props.path;
                },
                getScenarioType: function() {
                    return this._props.scenarioType;
                },
                getScalar: function(name) {
                    return this._entities[name];
                }
            };
        };

        beforeEach(function() {
            project._initProjectRevisionTracking.and.callThrough();
            spyOn(project.view.withFirstScenario().withEntities().notify(), "start");
            spyOn(project.view.withFirstScenario().withEntities(), "notify").and.callThrough();
            spyOn(project.view.withFirstScenario(), "withEntities").and.callThrough();
            spyOn(project.schema, "getAllEntities").and.returnValue(["a","b","c"]);
        })

        it("should use all entities if 'all' is specified", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            project.config.projectEntities = "all";
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).toHaveBeenCalledWith(["a","b","c"].concat([project.config.projectRevisionEntity]));
            expect(project.view.withFirstScenario().withEntities().notify).toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).toHaveBeenCalled();
        });
        it("should use the user list of entities if supplied", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
            project.config.projectEntities = ["x", "y", "z"];
            project._initProjectRevisionTracking();
            expect(project.view.withFirstScenario().withEntities).toHaveBeenCalledWith(["x","y","z"].concat([project.config.projectRevisionEntity]));
            expect(project.view.withFirstScenario().withEntities().notify).toHaveBeenCalled();
            expect(project.view.withFirstScenario().withEntities().notify().start).toHaveBeenCalled();
        });
        it("should use the user list of entities if supplied", function () {
            spyOn(project.view, "getScenarioIds").and.returnValue([]);
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
    describe('_handleProjectRevisionChangeNotification', function () {
        function scenario(properties, entities) {
            return {
                _props: _.cloneDeep(properties),
                _entities: _.cloneDeep(entities),
                getName: function() {
                    return this._props.name;
                },
                getPath: function() {
                    return this._props.path;
                },
                getScenarioType: function() {
                    return this._props.scenarioType;
                },
                getScalar: function(name) {
                    return this._entities[name];
                },
                modify: function() {
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
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}, {"ProjectRevision" : 11}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}, {"ProjectRevision" : 11}),
                scenario({name: "scenario 2", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 2"}, {"ProjectRevision" : 10})
                ];

            spyOn(project, "projectRevisionMessage");
            project._handleProjectRevisionChangeNotification(scenarios);
            expect(project.projectRevisionMessage).toHaveBeenCalledWith("The project configuration has changed since the following scenarios were executed: " + scenarios[2].getName());

        });
        it("should not return a message if the scenarios are the same revision as the project", function () {
            project.projectRevision = 10;
            var scenarios = [
                scenario({name: "project 1", scenarioType: project.config.projectScenarioType, path: "/myapp/project 1/project 1"}, {"ProjectRevision" : 11}),
                scenario({name: "scenario 1", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 1"}, {"ProjectRevision" : 11}),
                scenario({name: "scenario 2", scenarioType: "SCENARIO", path: "/myapp/project 1/scenario 2"}, {"ProjectRevision" : 11})
            ];

            spyOn(project, "projectRevisionMessage");
            project._handleProjectRevisionChangeNotification(scenarios);
            expect(project.projectRevisionMessage).toHaveBeenCalledWith(undefined);

        });
    });
});
